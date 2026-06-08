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
2. Upload the pipeline status file to the root of your bucket:

📄 [`pipeline_status.json`](pipeline_status.json)

---

### Step 3: Raster Processing Cloud Function

This function detects new COG files uploaded to your storage bucket, reads their data against your BigQuery spatial boundaries via `ST_REGIONSTATS`, and updates your reporting table.

**Setup:**

1. Create a new Cloud Function named `raster-pipeline`.
2. Configure a **Cloud Storage Trigger** on your bucket (Event type: *Finalizing / On Upload*).
3. Set the request timeout to **3600 seconds**.
4. Deploy the following files into the function:

📄 [`requirements.txt`](pipeline_guide/raster_file/requirements.txt)

📄 [`main.py`](pipeline_guide/raster_file/main.py)

> **Before deploying:** replace `BUCKET_NAME` at the top of `main.py` with your actual bucket name, and update the BigQuery project/dataset/table references in the `CREATE TABLE` and `MERGE` queries.

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
3. Deploy the following files:

📄 [`drive_sync/requirements.txt`](pipeline_guide/drive_sync/requirements.txt)

📄 [`drive_sync/main.py`](pipeline_guide/drive_sync/main.py)

> **Before deploying:** replace `DRIVE_FOLDER_ID` and `BUCKET_NAME` at the top of `main.py` with your actual values.

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

If your simulation output exceeds ~200k rows or 10 MB, load it into BigQuery and connect from there instead.

1. In BigQuery, open your dataset (`map_data_us`) → **Create Table**.
2. Source: **Google Drive** → paste your Google Sheets URL. File format: **Google Sheets**.
3. Table name: `gama_output`. Enable **Auto-detect schema** → **Create Table**.

> BigQuery does not allow spaces in column names. Rename columns in Sheets first if needed (e.g. `Flood Stress` → `Flood_Stress`).

4. In Looker Studio, connect to **BigQuery** → `map_data_us` → `gama_output` instead of Google Sheets.
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
   - **Location** → `Area` column (detected as GEOGRAPHY — polygon boundaries).
   - **Tooltip** → `id` column.
   - **Color Metric** → `AverageValue` (shades polygons by raster-extracted value).
3. Add a **Drop-down list control** with dimension `Index` — lets viewers switch between *Sowing Date* and *Cropping Intensity* layers.
4. Add a **Slider control** using `Year` to scrub through historical trends.

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
2. **Import into GEE** — Reference the public or service-account-accessible COG URLs inside the Code Editor.
3. **Set Permissions** — Ensure the underlying assets or cloud buckets are shared publicly.
4. **Build the GEE App** — Deploy the visualization script as an official Earth Engine App.
5. **Embed** — Paste the GEE App URL into a **URL Embed** widget inside Looker Studio.

### Step 1: Earth Engine Implementation Script

Open the [Google Earth Engine Code Editor](https://code.earthengine.google.com/) and paste the script below. It sets up a clean baseline map, handles smooth crossfade transitions between years, manages an interactive polygon inspector on click, and renders a continuous legend.

> **Note:** Define `image` through `image7` at the top of your script pointing to your Cloud Assets. Make sure `table` is set to your imported CSV polygon FeatureCollection.

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
