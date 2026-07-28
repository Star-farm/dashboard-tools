# Building a Raster Processing Pipeline with BigQuery & Google Looker Studio

A step-by-step guide to automating a geospatial data pipeline that ingests GeoTIFF files from Google Drive, syncs them to Google Cloud Storage (GCS), extracts regional statistics using BigQuery, and serves the finalized dataset to Looker Studio for interactive visualization.

---

## 1. Prerequisites & System Requirements

### Software & Platforms

- **Google Cloud Account** — Active account with billing enabled (BigQuery, Cloud Functions, Cloud Scheduler).
- **Google Drive** — A dedicated folder for source spatial files.
- **QGIS (v3.12 or later)** — Open-source GIS software for desktop data preparation.
- **GAMA Platform** — *(Optional)* For advanced spatial simulation modeling.

### Google Cloud APIs

Enable these APIs in the project before deploying:

- BigQuery API
- Cloud Storage API
- Cloud Run Admin API and Cloud Build API
- Eventarc API
- Cloud Scheduler API
- Google Drive API

### Location Strategy

This guide uses `us-central1` as a conservative compatibility baseline. Do not assume that every Google Cloud product is available in every region, and do not blindly assign one location to every resource.

| Resource | Location used in this guide | Rule |
|----------|-----------------------------|------|
| BigQuery dataset | `us-central1` | Confirm that BigQuery and the required raster functions are supported before choosing another location. |
| Cloud Storage bucket | `us-central1` | Keep the raster bucket colocated with the BigQuery dataset where possible to reduce transfer cost and latency. |
| Eventarc Storage trigger | `us-central1` | Must match the Cloud Storage bucket location. |
| Cloud Run functions | `us-central1` | May technically differ from the Eventarc trigger, but colocation is recommended. |
| Cloud Scheduler jobs | `us-central1` | The job region does not determine the cron timezone; configure the timezone separately. |
| Looker Studio / Earth Engine | Managed service | These are not configured by assigning the pipeline's Cloud Run region. |

If organizational policy requires an Asia region, verify every row above against the current Google Cloud location documentation before replacing `us-central1`. A split-region deployment is possible, but it can add latency, transfer charges, and data-residency considerations.

### Data Assets

- **Base Spatial Boundary Dataset** — A CSV file with at least an `id` column and an `Area` column in Polygon format (WKT or GeoJSON). Keep the lowercase `id` name because the supplied SQL references it directly.
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
2. Set the dataset location to `us-central1`, or to another location that you have verified for every required BigQuery feature.
3. Create a new table and import your base spatial `.CSV` boundaries file.
4. Confirm that `id` is an integer and `Area` is a valid `GEOGRAPHY` polygon. If `Area` was imported as text, convert it with `ST_GEOGFROMTEXT` or `ST_GEOGFROMGEOJSON` before running the raster pipeline.

#### Cloud Storage Bucket

1. Create a standard Cloud Storage bucket in `us-central1`. If you choose another location, use that exact bucket location for the Eventarc Storage trigger.
2. Upload the pipeline status file to the root of your bucket:

📄 [`pipeline_status.json`](pipeline_status.json)

---

### Step 3: Raster Processing Cloud Function

This service receives Cloud Storage finalize events through Eventarc, reads each new COG against the BigQuery spatial boundaries with `ST_REGIONSTATS`, and updates the reporting table. The supplied entry point is HTTP-based because it also exposes the `/reset` route.

**Setup:**

1. Deploy `raster_file` as a second-generation Cloud Run function named `raster-pipeline`.
2. Set the runtime entry point to `main_router` and the trigger type to **HTTP**.
3. Set the request timeout to **3600 seconds** and require authentication.
4. Deploy the following files:

📄 [`requirements.txt`](raster_file/requirements.txt)

📄 [`main.py`](raster_file/main.py)

> **Before deploying:** replace `BUCKET_NAME` at the top of `main.py` with your actual bucket name, and update the BigQuery project/dataset/table references in the `CREATE TABLE` and `MERGE` queries.

After deployment, create an Eventarc trigger that routes `google.cloud.storage.object.v1.finalized` events from the bucket to the `raster-pipeline` service. Grant the trigger's service account permission to invoke the service.

The raster service account needs, at minimum, permission to:

- Read the source COGs and read/write `pipeline_status.json` and retry state in the bucket.
- Read the boundary table and create/update the reporting table in BigQuery.
- Run BigQuery jobs.

> File naming requirement: each `.tif` or `.tiff` name must contain a four-digit year. Names containing `sowing` are classified as **Sowing Date**; all other raster names are currently classified as **Cropping Intensity**. Update `metric_type` in `main.py` before introducing another raster category.

---

### Step 4: Automating Safety Resets (Cloud Scheduler)

Automatically recovers the pipeline from daily quota locks.

1. Open **Cloud Scheduler** and create a new job.
2. Select `us-central1` (or any Cloud Scheduler region allowed by your organization) and set the timezone to `Asia/Ho_Chi_Minh`.
3. Set the Cron Schedule to `5 0 * * *` *(runs daily at 12:05 AM ICT)*.
4. Set Target Type to **HTTP**.
5. Set the URL to your Cloud Function URL appended with `/reset`:
   ```
   https://[your-function-url].run.app/reset
   ```
6. Use the `GET` method and attach an OIDC token from a service account that has permission to invoke `raster-pipeline`.

> The reset endpoint clears the lock and retry counters. It does not retry previously failed rasters automatically; re-upload or re-trigger the affected object after investigating the error.

---

### Step 5: Google Drive Synchronization Cloud Function

This function scans a Google Drive folder for new or modified TIFF files and **copies** them to Cloud Storage. It does not delete or move the source files in Drive.

**Setup:**

1. Create a Cloud Function named `drive-to-gcs-sync`.
2. Set the trigger type to **HTTP**.
3. Set the runtime entry point to `sync_drive_to_gcs` and require authentication.
4. Deploy the following files:

📄 [`drive_sync/requirements.txt`](drive_sync/requirements.txt)

📄 [`drive_sync/main.py`](drive_sync/main.py)

> **Before deploying:** replace `DRIVE_FOLDER_ID` and `BUCKET_NAME` at the top of `main.py` with your actual values.

Share the source Drive folder with the function's service-account email as a Viewer. Give that service account permission to create objects and read/write `sync_checkpoint.txt` in the destination bucket.

Create a second Cloud Scheduler job to invoke this function periodically, for example:

- Schedule: `*/15 * * * *`
- Timezone: `Asia/Ho_Chi_Minh`
- Method: `GET`
- URL: the deployed `drive-to-gcs-sync` service URL
- Authentication: OIDC token from a service account allowed to invoke the service

> The supplied implementation reads at most 100 matching files per scan. Add Drive API pagination before using it with larger folders. For a Google Shared Drive, also add `supportsAllDrives`, `includeItemsFromAllDrives`, `corpora`, and `driveId` to the Drive API request.

---

## 3. Connecting GAMA Simulation Output (CSV) to Looker Studio

GAMA exports per-agent tabular data as CSV files with simulation metrics across time. This data is used purely for **KPI scorecards and charts** in Looker Studio.

| id | datetime | seed | Fertilizer Usage | Water Usage | Flood Stress | Drought Stress | Biodiversity | Emission Intensity |
|----|----------|------|-----------------|-------------|-------------|---------------|-------------|-------------------|
| 279 | 2/19/2026 | 132 | 4.69 | 876.60 | 0 | 0 | 1 | 0.0391 |
| 262 | 2/18/2026 | 100 | 6.22 | 799.26 | 0 | 0 | 1 | 0.0383 |

### Step 1: Upload the CSV to Google Sheets

1. Open [Google Sheets](https://sheets.google.com) and create a new spreadsheet (e.g. `GAMA_Simulation_Output`).
2. Go to **File > Import**, upload your `.csv` file, choose **Replace spreadsheet**, separator: **Comma**.
3. If you have multiple simulation runs, append all rows into one sheet — use the `seed` column to identify each run and `datetime` to track timesteps.

### Step 2: Connect Google Sheets to Looker Studio

1. Open [Looker Studio](https://lookerstudio.google.com/) → **Blank Report**.
2. Under *Connect to data*, select **Google Sheets**.
3. Choose your `GAMA_Simulation_Output` spreadsheet and the relevant sheet tab. Enable **Use first row as headers**.
4. Click **Add**.

### Step 3: Build KPI and Chart Panels

**Scorecards (KPIs)** — add a Scorecard chart for each key metric:

- **Average** `Emission Intensity` across all agents and timesteps.
- **Average** `Water Usage`, `Fertilizer Usage`, `Pesticide Usage`.
- **Average** `Biodiversity`, `Resilient Varieties`, `Water Reliability`, `AWD Adoption`.
- **Max** `Flood Stress`, `Drought Stress`, `Salinity Stress` (binary flags — useful for seeing if any agent experienced stress).

> Only configure metrics that exist in your exported schema. The sample table above contains `Fertilizer Usage`, `Water Usage`, `Flood Stress`, `Drought Stress`, `Biodiversity`, and `Emission Intensity`. Add the other fields to the GAMA export first, or omit their scorecards and filters.

**Time Series Charts** — track metrics over the simulation period:

- X-axis → `datetime`
- Metric → `Emission Intensity`, `Water Usage`, or `Biodiversity`
- Breakdown dimension → `seed` (plots one line per simulation run for comparison)

**Bar / Column Charts** — compare averages across agent groups or scenario seeds:

- Dimension → `seed` or `id`
- Metrics → `Fertilizer Usage`, `Pesticide Usage`, `Water Usage`

**Controls (Filters)** — add interactive controls to let viewers slice the data:

- **Date Range control** → `datetime`
- **Drop-down list** → `seed` (switch between simulation runs / scenarios)
- **Drop-down list** → `Flood Stress` / `Drought Stress` / `Salinity Stress` (filter to stressed agents only)

### Path B — Via BigQuery *(if the CSV is too large for Google Sheets)*

If the sheet becomes slow, exceeds Google Sheets limits, or needs reliable scheduled ingestion, store the output in a native BigQuery table and connect Looker Studio to that table.

1. In BigQuery, open your dataset → **Create Table**.
2. Upload the CSV from your computer or first place it in Cloud Storage and select that object as the source.
3. Select **CSV**, set the table name to `gama_output`, enable schema auto-detection, review the detected types, and create the table.

> Prefer portable column names containing letters, numbers, and underscores (for example, `Flood_Stress`). BigQuery supports some flexible column names, but spaces can require quoting and may not work consistently across connectors and external tables.

4. In Looker Studio, connect to **BigQuery** → your dataset → `gama_output` instead of Google Sheets.
5. Build the same KPI and chart panels as above.

---

## 4. Looker Studio Visualization Setup

Two separate dashboards — one for the **raster pipeline output** (spatial map), one for **GAMA simulation output** (KPIs and charts). Build them as separate pages inside the same Looker Studio report.

### Dashboard A — Raster Pipeline Map

Once the cloud pipeline is running, the `datastudio_output` table populates with geographic shapes and aggregated raster values.

**Connecting the Data:**

1. Open [Looker Studio](https://lookerstudio.google.com/) → **Blank Report**.
2. Under *Connect to data*, select **BigQuery**.
3. Choose your **Project ID**, dataset (`map_data_us`), and the `datastudio_output` table → **Add**.

**Building the Interactive Map:**

1. Click **Add a chart** → **Google Maps** (or *Filled Map*).
2. Configure chart fields:
   - **Location** → `id` column (a unique identifier for each polygon).
   - **Geospatial field** → `Area` column (detected as BigQuery `GEOGRAPHY`).
   - **Tooltip** → `id` column.
   - **Color Metric** → `AverageValue` (shades polygons by raster-extracted value).
3. Add a **Drop-down list control** with dimension `Index` — lets viewers switch between *Sowing Date* and *Cropping Intensity* layers.
4. Add a **Slider control** using `Year` to scrub through historical trends.

> Looker Studio Google Maps has a polygon-vertex limit. If polygons are missing, increase **Max number of polygon vertices** in the chart style settings, apply filters, or simplify the geometry in BigQuery with `ST_SIMPLIFY`.

### Dashboard B — GAMA Simulation KPIs & Charts

Add a second page and connect it to the GAMA Google Sheet (or BigQuery table if using Path B).

**Connecting the Data:**

1. Click **Add data** → **Google Sheets** (or **BigQuery** for Path B).
2. Select your `GAMA_Simulation_Output` spreadsheet → **Add**.

Then build Scorecards, Time Series charts, Bar charts, and Controls exactly as described in Section 3 — Step 3.

---

## 5. Alternative: Time-Series Map App with Google Earth Engine (GEE)

While Looker Studio handles vector shapes well, rendering dense pixel-level raster data over multiple years can impact dashboard performance. An alternative is to host your Cloud Optimized GeoTIFFs in **Google Earth Engine**, build a custom app, and embed it into Looker Studio via **URL Embed**.

### Workflow Overview

1. **Host COGs** — Store your processed GeoTIFF files on Google Earth Engine Cloud Assets.
2. **Import into GEE** — Import the rasters as Earth Engine assets or reference storage objects using an access method supported by Earth Engine.
3. **Set Permissions** — Grant only the access required by the deployed Earth Engine App. Do not make the source bucket public unless public data access is intentional.
4. **Build the GEE App** — Deploy the visualization script as an official Earth Engine App.
5. **Embed** — Paste the GEE App URL into a **URL Embed** widget inside Looker Studio.

### Step 1: Earth Engine Implementation Script

Open the [Google Earth Engine Code Editor](https://code.earthengine.google.com/) and paste the script below. It sets up a clean baseline map, handles smooth crossfade transitions between years, manages an interactive polygon inspector on click, and renders a continuous legend.

> **Required assets:** the current script expects `table` to be an Earth Engine polygon `FeatureCollection` and expects raster variables through `image21`: `image`–`image7` for Cropping Intensity (2018–2024), `image8`–`image13` for Flooding Duration (2015–2020), and `image14`–`image21` for Sowing Date (2018–2025). Remove unused modes or define every referenced variable before running the script.

📄 [`gee_visualization.js`](gee_visualization.js)

**Key features of the script:**

- **Smooth crossfade** — When auto-playing, each year transition fades over 1.5 seconds using 20 opacity steps fired via `ui.util.setTimeout`.
- **Instant snap** — Clicking a year button switches immediately without any fade delay.
- **Play from current year** — Pressing Play starts from whichever year is currently displayed and runs to 2024, then stops. It only resets to 2018 if already at the last year.
- **Polygon inspector** — Clicking any polygon displays the pixel value at the click point and the mean raster value across the whole polygon, batched in a single server round-trip.

### Step 2: Deploy and Embed into Looker Studio

**Publish the Earth Engine App:**

1. Click the **Apps** button in the upper-right corner of the GEE Code Editor.
2. Select **New App**. Specify an App Name and link it to your current script.
3. Set the restriction policy to allow public viewing.
4. Click **Publish**. GEE outputs a standalone deployment URL (e.g., `https://your-username.ee_apps.io/app-name`).

**Embed into Looker Studio:**

1. Open your Looker Studio report.
2. In the top toolbar, click **Add a chart** → **URL Embed**.
3. Draw the embed frame onto your canvas.
4. In the right-hand properties panel, paste your GEE App URL into the **External Content URL** field.
5. Resize the frame to give viewers enough space to interact with the timeline, inspector, and animation controls.
