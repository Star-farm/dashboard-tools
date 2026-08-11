# Google Cloud Storage Setup

The optional geospatial workflow in [Data Studio Guide](../Data%20Studio%20guide/README.md) also uses GCS for raster files, pipeline state, and Drive synchronization. Prefer a separate private bucket for that data so model-runtime and geospatial service accounts can receive only the permissions they need. If one bucket is shared, keep model artifacts under `model-cache/` and geospatial objects under separate prefixes, then scope IAM permissions carefully.

## Authenticate and define values

```powershell
gcloud auth login
gcloud auth application-default login

$env:GCP_PROJECT = "<gcp-project-id>"
$env:GCP_REGION = "<gcp-region>"
$env:MODEL_BUCKET = "<globally-unique-model-artifact-bucket>"
$env:CLOUD_RUN_SA_NAME = "<runtime-service-account-name>"
$env:CLOUD_RUN_SA = "${env:CLOUD_RUN_SA_NAME}@${env:GCP_PROJECT}.iam.gserviceaccount.com"
$env:GCLOUD_ACCOUNT = (gcloud config get-value account)
gcloud config set project $env:GCP_PROJECT
```

The bucket name must be globally unique. These variables exist only in the current PowerShell session.

## Enable APIs and create storage

```powershell
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com storage.googleapis.com secretmanager.googleapis.com

gcloud storage buckets create "gs://$env:MODEL_BUCKET" --project $env:GCP_PROJECT --location $env:GCP_REGION --uniform-bucket-level-access --pap
```

## Configure the runtime identity

```powershell
gcloud iam service-accounts create $env:CLOUD_RUN_SA_NAME --project $env:GCP_PROJECT --display-name "Cloud Run application runtime"

gcloud iam service-accounts add-iam-policy-binding $env:CLOUD_RUN_SA --project $env:GCP_PROJECT --member "user:$env:GCLOUD_ACCOUNT" --role "roles/iam.serviceAccountUser"

gcloud storage buckets add-iam-policy-binding "gs://$env:MODEL_BUCKET" --member "serviceAccount:$env:CLOUD_RUN_SA" --role "roles/storage.objectViewer"
```

Cloud Run receives read-only artifact access. The local account used for training must separately have permission to upload objects.

## Upload and verify an artifact

From a checkout that contains the backend training code and dataset:

```powershell
$env:DEFAULT_CSV_PATH = "data/Simulation_Data.csv"
$env:GCS_CACHE_BUCKET = $env:MODEL_BUCKET
python -m app.ml.train

gcloud storage ls "gs://$env:MODEL_BUCKET/model-cache/v13_model_bundle_*.joblib"
```

Serving checks `MODEL_CACHE_DIR` first and downloads the matching artifact from `gs://<bucket>/model-cache/` on a cache miss. Artifact names include the dataset fingerprint; do not modify `Simulation_Data.csv` between training and deployment.

## Configure Cloud Run

Configure the revision with the runtime service account above and these variables:

| Name | Value |
| --- | --- |
| `GCS_CACHE_BUCKET` | Private model-artifact bucket name |
| `DEFAULT_CSV_PATH` | `data/Simulation_Data.csv` |
| `ALLOWED_ORIGINS` | Production frontend origin |
| `ENFORCE_HTTPS` | `true` |
| `ENABLE_DOCS` | `false` |
| `RATE_LIMIT_PER_MIN` | `60` |
| `TRUST_PROXY_HEADERS` | `true` |

The runtime identity needs `Storage Object Viewer` on the bucket. Do not set `GOOGLE_APPLICATION_CREDENTIALS`; Cloud Run uses its assigned identity. Do not add `PORT`; Cloud Run supplies it automatically. Store API keys in Secret Manager, not as plain environment variables, and retain the previous artifact until the new revision starts successfully.

Official references: [Cloud Storage bucket creation](https://cloud.google.com/storage/docs/creating-buckets), [Cloud Run environment variables](https://cloud.google.com/run/docs/configuring/services/environment-variables), and [Secret Manager setup](https://cloud.google.com/secret-manager/docs/create-secret-quickstart).
