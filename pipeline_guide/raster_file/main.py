import functions_framework
import json
import re
import base64
import traceback
from google.cloud import bigquery
from google.cloud import storage

# ── Configuration ─────────────────────────────────────────────────────────────
BUCKET_NAME    = 'xxxxxx'  # TODO: Replace with your bucket name
STATUS_FILE    = '../../pipeline_status.json'
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
