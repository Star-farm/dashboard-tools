# Building a Raster Processing Pipeline with BigQuery & Google Looker Studio

A step-by-step guide to automating a geospatial data pipeline that ingests GeoTIFF files from Google Drive, syncs them to Google Cloud Storage (GCS), extracts regional statistics using BigQuery, and serves the finalized dataset to Looker Studio for interactive visualization.

---

## 1. Prerequisites & System Requirements

### Software & Platforms

- **Google Cloud Account** — Active account with billing enabled (BigQuery, Cloud Functions, Cloud Scheduler).
- **Google Drive** — A dedicated folder for source spatial files.
- **QGIS (v3.12 or later)** — Open-source GIS software for desktop data preparation.
- **GAMA Platform** — *(Optional)* For advanced spatial simulation modeling.

### Data Assets

- **Base Spatial Boundary Dataset** — A CSV file with at least an `ID` column and an `Area` column in Polygon format (WKT or GeoJSON).
- **Source Raster Files** — GeoTIFF maps representing regional metrics across time (e.g., `sowing_date.zip` or `cropping_intensity.zip` from [VietSco](https://www.vietsco.org/)).

---

## 2. Technical Implementation

### Step 1: Desktop GIS Pre-processing (QGIS)

1. **Extract and Load** — Unzip your source data files and drag the `.tif` layers into QGIS.
2. **Reproject to WGS84 (EPSG:4326)** — Source `.tif` files are often in local coordinate systems (e.g., *WGS 84 / UTM*) that are incompatible with Google APIs.
    - Navigate to **Raster > Projections > Warp (Reproject)**.
    - Set target CRS to **EPSG:4326 - WGS 84**.
3. **Merge Files** *(Optional)* — If spatial regions are split into tiles, go to **Raster > Miscellaneous > Merge**. Keep individual files under **1.5 GB** for optimal cloud performance.
4. **Convert to Cloud Optimized GeoTIFF (COG)** — Export using the **COG** profile. This allows cloud systems to stream specific pixel regions without downloading the entire file.

---

### Step 2: Google Cloud Infrastructure Setup

#### BigQuery Dataset

1. Open the BigQuery console and create a new dataset.
2. Set the dataset location to `us-west` (keep all services in the same region).
3. Create a new table and import your base spatial `.CSV` boundaries file.

#### Cloud Storage Bucket

1. Create a standard Cloud Storage bucket in the same region (`us-west`).
2. Create a local file named `pipeline_status.json` with the following content:

```json
{"state": "ACTIVE"}
```

3. Upload `pipeline_status.json` to the root of your bucket.

---

### Step 3: Raster Processing Cloud Function

This function detects new COG files uploaded to your storage bucket, reads their data against your BigQuery spatial boundaries via `ST_REGIONSTATS`, and updates your reporting table.

**Setup:**

1. Create a new Cloud Function named `raster-pipeline`.
2. Configure a **Cloud Storage Trigger** on your bucket (Event type: *Finalizing / On Upload*).
3. Set the request timeout to **3600 seconds**.

#### `requirements.txt`

```text
functions-framework==3.*
google-cloud-bigquery==3.*
google-cloud-storage==2.*
google-cloud-bigquery-storage>=2.25.0
pyarrow>=14.0.0
db-dtypes>=1.2.0
```

#### `main.py`

```python
import functions_framework
import json
import re
import base64
import traceback
from google.cloud import bigquery
from google.cloud import storage

# ── Configuration ─────────────────────────────────────────────────────────────
BUCKET_NAME    = 'xxxxxx'  # TODO: Replace with your bucket name
STATUS_FILE    = 'pipeline_status.json'
RETRY_FILE     = 'pipeline_retry_counts.json'
MAX_RETRIES    = 3

# ── Status Management ─────────────────────────────────────────────────────────
def is_pipeline_locked():
    try:
        client = storage.Client()
        blob   = client.bucket(BUCKET_NAME).blob(STATUS_FILE)
        if not blob.exists():
            return False
        status = json.loads(blob.download_as_string())
        return status.get("state") == "LOCKED"
    except Exception as e:
        print(f"[WARN] is_pipeline_locked: {e}")
        return False

def lock_pipeline(reason):
    try:
        client = storage.Client()
        blob   = client.bucket(BUCKET_NAME).blob(STATUS_FILE)
        blob.upload_from_string(json.dumps({"state": "LOCKED", "reason": reason}))
        print(f"[INFO] Pipeline locked: {reason}")
    except Exception as e:
        print(f"[WARN] lock_pipeline: {e}")

def unlock_pipeline(reason="reset by user"):
    client = storage.Client()
    blob   = client.bucket(BUCKET_NAME).blob(STATUS_FILE)
    blob.upload_from_string(json.dumps({"state": "ACTIVE", "reason": reason}))
    print(f"[INFO] Pipeline unlocked: {reason}")

# ── Retry Counter Management ──────────────────────────────────────────────────
def _load_retry_counts() -> dict:
    try:
        client = storage.Client()
        blob   = client.bucket(BUCKET_NAME).blob(RETRY_FILE)
        if not blob.exists():
            return {}
        return json.loads(blob.download_as_string())
    except Exception as e:
        print(f"[WARN] _load_retry_counts: {e}")
        return {}

def _save_retry_counts(counts: dict):
    try:
        client = storage.Client()
        blob   = client.bucket(BUCKET_NAME).blob(RETRY_FILE)
        blob.upload_from_string(json.dumps(counts))
    except Exception as e:
        print(f"[WARN] _save_retry_counts: {e}")

def increment_retry(file_name: str) -> int:
    counts = _load_retry_counts()
    counts[file_name] = counts.get(file_name, 0) + 1
    _save_retry_counts(counts)
    print(f"[INFO] Retry count for '{file_name}': {counts[file_name]}/{MAX_RETRIES}")
    return counts[file_name]

def reset_retry(file_name: str):
    counts = _load_retry_counts()
    if file_name in counts:
        del counts[file_name]
        _save_retry_counts(counts)
        print(f"[INFO] Retry count reset for '{file_name}'")

def reset_all_retries():
    try:
        client = storage.Client()
        blob   = client.bucket(BUCKET_NAME).blob(RETRY_FILE)
        blob.upload_from_string(json.dumps({}))
        print("[INFO] All retry counts cleared")
    except Exception as e:
        print(f"[WARN] reset_all_retries: {e}")

# ── Payload Extraction ────────────────────────────────────────────────────────
def extract_event_data(request):
    body = request.get_json(force=True, silent=True)
    if not isinstance(body, dict):
        raise ValueError("Body is empty or not a JSON object")

    if "message" in body:
        encoded = body["message"].get("data", "")
        if not encoded:
            raise ValueError("Pub/Sub message has no 'data' field")
        decoded    = base64.b64decode(encoded).decode("utf-8")
        return json.loads(decoded)

    if "data" in body and isinstance(body["data"], dict):
        return body["data"]

    if "bucket" in body and "name" in body:
        return body

    raise ValueError(f"Unrecognised body shape.")

# ── Data Processing ───────────────────────────────────────────────────────────
def process_raster_data(event_data: dict) -> str:
    if not isinstance(event_data, dict):
        raise TypeError("process_raster_data expects dict")

    if is_pipeline_locked():
        return "LOCKED"

    bucket_name = event_data.get("bucket")
    file_name   = event_data.get("name")

    if not file_name or not file_name.lower().endswith(('.tif', '.tiff')) or not bucket_name:
        return "SKIPPED"

    gcs_uri     = f"gs://{bucket_name}/{file_name}"
    match       = re.search(r'\d{4}', file_name)
    data_year   = int(match.group()) if match else None
    metric_type = "Sowing Date" if "sowing" in file_name.lower() else "Cropping Intensity"

    if not data_year:
        return "SKIPPED"

    client = bigquery.Client()

    create_query = """
    CREATE TABLE IF NOT EXISTS `project-04ed6c28-00db-418c-802.map_data_us.datastudio_output` (
      id           INT64,
      Area         GEOGRAPHY,
      AverageValue FLOAT64,
      Index        STRING,
      Year         INT64,
      InputFile    STRING,
      UpdatedAt    TIMESTAMP
    )
    """
    try:
        client.query(create_query).result()
    except Exception as e:
        print(f"[WARN] CREATE TABLE skipped: {e}")

    # TODO: Replace tracking from base map table below
    merge_query = f"""
    MERGE `project-04ed6c28-00db-418c-802.map_data_us.datastudio_output` T
    USING (
      SELECT
        id,
        Area,
        ST_REGIONSTATS(Area, '{gcs_uri}', 'B0').mean AS AverageValue,
        '{metric_type}'                               AS Index,
        {data_year}                                   AS Year,
        '{file_name}'                                 AS InputFile
      FROM `project-XXXXXXXX.XXXXXXX.XXXXXXXXXXX`
    ) S
    ON  T.id = S.id AND T.Year = S.Year AND T.Index = S.Index
    WHEN MATCHED THEN
      UPDATE SET
        T.AverageValue = S.AverageValue,
        T.InputFile    = S.InputFile,
        T.UpdatedAt    = CURRENT_TIMESTAMP()
    WHEN NOT MATCHED THEN
      INSERT (id, Area, AverageValue, Index, Year, InputFile, UpdatedAt)
      VALUES (S.id, S.Area, S.AverageValue, S.Index, S.Year, S.InputFile, CURRENT_TIMESTAMP())
    """
    try:
        client.query(merge_query).result()
        reset_retry(file_name)
        return "SUCCESS"
    except Exception as e:
        error_msg = str(e).lower()
        retry_count = increment_retry(file_name)

        if retry_count >= MAX_RETRIES:
            reason = f"File '{file_name}' failed {retry_count} times — auto-locked"
            lock_pipeline(reason)
            return "LOCKED"

        if "quota" in error_msg or "rate limit" in error_msg or "429" in error_msg:
            lock_pipeline(f"Quota Exceeded on '{file_name}'")
            return "LOCKED"
        raise

# ── HTTP Entry Point ──────────────────────────────────────────────────────────
@functions_framework.http
def main_router(request):
    if request.path == "/reset":
        try:
            unlock_pipeline()
            reset_all_retries()
            return "Pipeline is ready (retry counts cleared)", 200
        except Exception as e:
            return f"Reset Error: {e}", 500

    if request.method == "POST":
        try:
            event_data = extract_event_data(request)
            result     = process_raster_data(event_data)
            if result == "LOCKED":
                return "Pipeline is locked", 423
            elif result == "SKIPPED":
                return f"Skipped: {event_data.get('name', '?')}", 200
            else:
                return f"Success: {event_data.get('name', '?')}", 200
        except Exception as e:
            return "Internal Error", 500
    return "Method Not Allowed", 405
```

---

### Step 4: Automating Safety Resets (Cloud Scheduler)

Automatically recovers the pipeline from daily quota locks.

1. Open **Cloud Scheduler** and create a new job.
2. Select your matching Cloud Region.
3. Set the Cron Schedule: `5 0 * * *` *(runs daily at 12:05 AM — Vietnam Timezone / ICT)*.
4. Set Target Type to **HTTP**.
5. Set the URL to your Cloud Function URL appended with `/reset`:
   ```
   https://[your-function-url].run.app/reset
   ```

---

### Step 5: Google Drive Synchronization Cloud Function

This function scans a shared Google Drive folder for new files and moves them to your Cloud Storage bucket to trigger processing.

**Setup:**

1. Create a Cloud Function named `drive-to-gcs-sync`.
2. Set the trigger type to **HTTP**.

#### `requirements.txt`

```text
functions-framework==3.*
google-cloud-storage>=2.0.0
google-api-python-client>=2.0.0
```

#### `main.py`

```python
import os
import io
import datetime
from google.cloud import storage
from googleapiclient.discovery import build
import googleapiclient.http
import google.auth
import functions_framework

DRIVE_FOLDER_ID = 'xxxxxxxxxxxxxxxxxxxxxxxxx'  # TODO: Replace with Drive Folder ID
BUCKET_NAME     = 'xxxxxxxxx'                  # TODO: Replace with Bucket Name
CHECKPOINT_FILE = 'sync_checkpoint.txt'

def get_last_scan_time(bucket):
    blob = bucket.blob(CHECKPOINT_FILE)
    if not blob.exists():
        return '2000-01-01T00:00:00Z'
    return blob.download_as_string().decode('utf-8')

def save_new_checkpoint(bucket, new_time):
    blob = bucket.blob(CHECKPOINT_FILE)
    blob.upload_from_string(new_time)

@functions_framework.http
def sync_drive_to_gcs(request):
    if request.args.get('reset') == 'true':
        try:
            storage_client = storage.Client()
            bucket = storage_client.bucket(BUCKET_NAME)
            blob = bucket.blob(CHECKPOINT_FILE)
            if blob.exists():
                blob.delete()
            return "Checkpoint reset successfully!", 200
        except Exception as e:
            return f"Error resetting: {str(e)}", 500

    try:
        credentials, project = google.auth.default(
            scopes=[
                'https://www.googleapis.com/auth/drive.readonly',
                'https://www.googleapis.com/auth/devstorage.read_write'
            ]
        )
        drive_service = build('drive', 'v3', credentials=credentials)
        gcs_client    = storage.Client(credentials=credentials)
        bucket        = gcs_client.bucket(BUCKET_NAME)

        last_scan_time = get_last_scan_time(bucket)
        query = (f"'{DRIVE_FOLDER_ID}' in parents and "
                 f"(mimeType = 'image/tiff' or name contains '.tif' or name contains '.tiff') and "
                 f"modifiedTime > '{last_scan_time}' and trashed = false")

        results = drive_service.files().list(
            q=query,
            fields="files(id, name, mimeType, modifiedTime)",
            pageSize=100
        ).execute()
        files = results.get('files', [])

        if not files:
            return "OK - No new files", 200

        max_modified_time = datetime.datetime.fromisoformat(last_scan_time.replace('Z', '+00:00'))

        for file in files:
            file_id, file_name = file['id'], file['name']
            if 'vnd.google-apps' in file.get('mimeType', ''):
                continue

            print(f"Syncing: {file_name}")
            drive_request = drive_service.files().get_media(fileId=file_id)
            blob = bucket.blob(file_name)

            with io.BytesIO() as buffer:
                downloader = googleapiclient.http.MediaIoBaseDownload(
                    buffer, drive_request, chunksize=5*1024*1024
                )
                with blob.open("wb") as gcs_file:
                    done = False
                    while not done:
                        status, done = downloader.next_chunk()
                        buffer.seek(0)
                        gcs_file.write(buffer.read())
                        buffer.seek(0)
                        buffer.truncate(0)

            file_mod_time = datetime.datetime.fromisoformat(
                file['modifiedTime'].replace('Z', '+00:00')
            )
            if file_mod_time > max_modified_time:
                max_modified_time = file_mod_time

        new_checkpoint = (
            max_modified_time + datetime.timedelta(seconds=1)
        ).isoformat().replace('+00:00', 'Z')
        save_new_checkpoint(bucket, new_checkpoint)

        return f"OK - Synchronized {len(files)} files", 200
    except Exception as e:
        return f"Error: {str(e)}", 500
```

---

## 3. Looker Studio Visualization Setup

Once cloud components are running, the `datastudio_output` table will populate with geographic shapes and aggregated values.

### Connecting the Data

1. Open [Google Looker Studio](https://lookerstudio.google.com/).
2. Click **Blank Report**.
3. Under *Connect to data*, search for and select **BigQuery**.
4. Choose your **Project ID**, dataset (`map_data_us`), and the `datastudio_output` table. Click **Add**.

### Building the Interactive Map

1. Click **Add a chart** and choose **Google Maps** (or *Filled Map*).
2. Configure the chart fields:
    - **Location / Geospatial Dimension** → `Area` column (detected as GEOGRAPHY).
    - **Tooltip / Identification** → `id` column.
    - **Color Metric** → `AverageValue` (shades polygons dynamically based on raster calculations).
3. Add a **Drop-down list control** with dimension set to `Index` — lets viewers switch between *Sowing Date* and *Cropping Intensity* layers.
4. Add a **Slider control** using the `Year` field to scrub through historical trends.
