# Optional Google Cloud Storage Setup

Google Cloud Storage is optional. The repository uses it in two distinct workflows:

1. **VPS model artifacts:** optional remote backup/recovery for fingerprinted `ModelBundle` files. The current VPS code does not implement this integration by default.
2. **Data Studio geospatial pipeline:** optional storage for raster files, pipeline state, and Google Drive synchronization, as documented in the [Data Studio Guide](../Data%20Studio%20guide/README.md).

Use separate private buckets when possible so each service account receives only the access it needs. If one bucket is shared, keep model artifacts under `model-cache/` and geospatial data under separate prefixes.

## 1. Authenticate and define values

Install Google Cloud CLI, then run:

```powershell
gcloud auth login
gcloud auth application-default login

$env:GCP_PROJECT = "<gcp-project-id>"
$env:GCP_REGION = "<gcp-region>"
$env:MODEL_BUCKET = "<globally-unique-model-artifact-bucket>"
$env:RASTER_BUCKET = "<globally-unique-raster-pipeline-bucket>"
gcloud config set project $env:GCP_PROJECT
```

These PowerShell variables exist only in the current terminal session. Bucket names must be globally unique.

## 2. Enable required APIs

For optional model-artifact storage, enable Cloud Storage:

```powershell
gcloud services enable storage.googleapis.com
```

For the optional Data Studio raster pipeline, also enable the APIs listed in the [Data Studio Guide](../Data%20Studio%20guide/README.md#google-cloud-apis), including BigQuery, Cloud Run, Cloud Build, Eventarc, Cloud Scheduler, and Google Drive.

## 3. Create private buckets

Create only the buckets required by your workflow:

```powershell
gcloud storage buckets create "gs://$env:MODEL_BUCKET" --project $env:GCP_PROJECT --location $env:GCP_REGION --uniform-bucket-level-access --pap

gcloud storage buckets create "gs://$env:RASTER_BUCKET" --project $env:GCP_PROJECT --location $env:GCP_REGION --uniform-bucket-level-access --pap
```

Keep the raster bucket colocated with the BigQuery dataset and Eventarc trigger. Confirm product availability before choosing a region other than the one used in the Data Studio guide.

## 4. Optional VPS model-artifact integration

The default VPS deployment reads and writes `/app/model_cache` only. Setting `GCS_CACHE_BUCKET` alone does nothing until GCS support is implemented.

Required implementation work:

1. Add `google-cloud-storage` to `VPS/requirements.txt`.
2. Extend `VPS/app/ml/artifacts.py` to upload trained artifacts to `model-cache/` and download the matching fingerprinted artifact on a local cache miss.
3. Pass `GCS_CACHE_BUCKET` through `VPS/app/ml/train.py`, `VPS/app/ml/runtime.py`, and `VPS/app/mcp/server.py`.
4. Add tests for upload, download, missing objects, invalid artifacts, and local-cache fallback.
5. Configure `GCS_CACHE_BUCKET=<bucket-name>` only after that implementation is deployed.

Grant the training identity object-creation access and the serving identity `Storage Object Viewer`. Prefer an attached workload/runtime identity. If a VPS must use a service-account credential file, store it outside the repository and container image, restrict its filesystem permissions, and rotate it according to your security policy.

After training, verify the artifact:

```powershell
gcloud storage ls "gs://$env:MODEL_BUCKET/model-cache/v13_model_bundle_*.joblib"
```

Test startup with an empty local cache before relying on remote recovery. Do not modify `Simulation_Data.csv` between training and deployment because its content fingerprint is part of the artifact identity.

See [VPS Optional GCS](./VPS/README.md#optional-use-google-cloud-storage) for the service-specific checklist.

## 5. Optional Data Studio geospatial pipeline

The geospatial workflow uses its bucket for:

- GeoTIFF/COG input files;
- `pipeline_status.json` and retry state;
- `sync_checkpoint.txt` for Google Drive synchronization;
- Eventarc object-finalized events consumed by the raster service.

Follow [Optional A: Geospatial Prerequisites](../Data%20Studio%20guide/README.md#optional-a-geospatial-prerequisites-and-system-requirements) for the complete deployment. Configure the raster and Drive-sync service accounts separately and grant only the object and BigQuery permissions each component requires.

## Security Rules

- Keep buckets private and enable uniform bucket-level access.
- Do not commit `.env` files, service-account keys, bucket secrets, or generated model artifacts.
- Do not make a source bucket public unless public data access is intentional.
- Retain the previous production model artifact until the new deployment has passed health checks.
- Review IAM bindings periodically and remove unused identities.

Official references: [Cloud Storage bucket creation](https://cloud.google.com/storage/docs/creating-buckets), [Cloud Storage IAM](https://cloud.google.com/storage/docs/access-control/iam), and [Application Default Credentials](https://cloud.google.com/docs/authentication/provide-credentials-adc).
