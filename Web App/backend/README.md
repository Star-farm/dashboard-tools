# Backend Service

FastAPI backend designed for Google Cloud Run. Runtime implementation lives under `app/`; root Python files remain compatibility entrypoints for existing deployment commands.

## Technology and Model

- FastAPI, Uvicorn, and Pydantic.
- Separate Random Forest regressors for average yield, methane emissions, revenue, and production cost.
- Derived formulas for net income, profit margin, and emission intensity.
- Group-aware validation and residual-based P90 prediction intervals.
- Offline model training and a versioned `ModelBundle` artifact.
- Serving loads the artifact from local storage or Google Cloud Storage and fails startup if it is missing or invalid.
- API-key authentication, CORS allowlist, rate limiting, and request-body limiting.

## Local Development

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements-dev.txt
Copy-Item .env.example .env
python -m app.ml.train
python main.py
```

```powershell
Invoke-RestMethod http://127.0.0.1:8080/health
```

Swagger UI is available at `/docs` only when `ENABLE_DOCS=true`.

## Docker

```powershell
docker build -t star-farm-backend .
docker run --rm -p 8080:8080 --env-file .env star-farm-backend
```

## Authentication

All `/api/*` and `/mcp` routes require either:

```http
X-API-Key: your-api-key
```

or:

```http
Authorization: Bearer your-api-key
```

`/` and `/health` are public. `/api/data-status` still requires an API key.

## REST API

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/health` | Health check |
| `GET` | `/api/data-status` | Data and model status |
| `GET` | `/api/scenarios` | Available filter values |
| `POST` | `/api/compare` | Compare KPIs by a data dimension |
| `POST` | `/api/simulate` | Simulate one input set |
| `POST` | `/api/optimize` | Optimize inputs for a methane target |
| `POST` | `/api/optimize/resource` | Optimize selected resources |
| `POST` | `/api/kpi-change` | Calculate KPI changes from 2022 to 2050 |
| `*` | `/mcp` | MCP SSE endpoint |

Example simulation request:

```powershell
$headers = @{ "X-API-Key" = "your-api-key" }
$body = @{
  scenario_group = "One Million Hectare Rice"
  awd_adoption = "With AWD"
  fertilizer_usage = 120
  pesticide_usage = 5
  water_usage = 700
} | ConvertTo-Json

Invoke-RestMethod -Method Post `
  -Uri http://127.0.0.1:8080/api/simulate `
  -Headers $headers -ContentType "application/json" -Body $body
```

## Environment Variables

| Name | Requirement | Purpose |
| --- | --- | --- |
| `API_KEYS` | Required; use Secret Manager on Cloud Run | Comma-separated API keys |
| `DEFAULT_CSV_PATH` | Optional; defaults to `data/Simulation_Data.csv` | Simulation dataset packaged with the service |
| `MODEL_CACHE_DIR` | Optional; defaults to an OS temporary directory | Local artifact download/cache directory |
| `GCS_CACHE_BUCKET` | Required on Cloud Run | Private GCS bucket containing model artifacts; configure outside source control |
| `ALLOWED_ORIGINS` | Required for the production frontend | Comma-separated browser origins; the source default allows local development only |
| `RATE_LIMIT_PER_MIN` | Optional; defaults to `60` | Requests allowed per client per minute |
| `MAX_CONTENT_LENGTH_BYTES` | Optional; defaults to `2097152` | Maximum request-body size |
| `TRUST_PROXY_HEADERS` | Recommended `true` on Cloud Run | Trust client IP headers supplied by the managed proxy |
| `ENABLE_DOCS` | Optional; defaults to `false` | Enable Swagger and OpenAPI |
| `ENFORCE_HTTPS` | Optional; defaults to `false` | Enable application-level HTTPS enforcement/HSTS |
| `LOG_LEVEL` | Optional; defaults to `INFO` | Application logging level |
| `PORT` | Managed by Cloud Run; local default is `8080` | HTTP port |

Never commit `.env`, GCP credentials, or model-cache files.

## Training and Serving

Training and serving are separate processes. Serving never fits a model and will stop with a clear error when the artifact is missing, corrupt, built for another model version, or built from another CSV.

Run training manually before starting or deploying:

```powershell
python -m app.ml.train
```

This command uses only the existing `DEFAULT_CSV_PATH`, `MODEL_CACHE_DIR`, and `GCS_CACHE_BUCKET` variables. It packages models, encoders, validation report, model version, and dataset fingerprint into one `ModelBundle` artifact.

Artifact lookup during serving is:

1. `MODEL_CACHE_DIR/v13_model_bundle_<csv-fingerprint>.joblib`.
2. If absent and `GCS_CACHE_BUCKET` is configured, `gs://<bucket>/model-cache/v13_model_bundle_<csv-fingerprint>.joblib` is downloaded.
3. If neither location contains a valid artifact, application startup fails. There is no training fallback.

For this Cloud Run deployment, train locally and upload the artifact to the private bucket configured through `GCS_CACHE_BUCKET` before deploying the local source. No bucket name is stored in this repository, and no new environment variable is required.

The complete feature list, prediction flow, formulas, aggregation behavior, and P90 calculation are documented in [Model Documentation](../MODEL.md).

## Testing and Auditing

```powershell
python -m pytest
python -m pip_audit -r requirements.txt
```

## Cloud Run Deployment

This section bootstraps a new Cloud Run environment directly from the local **backend** directory. Google Cloud builds the submitted source; no local Docker build or manual image push is required.

### 1. Authenticate

Install Google Cloud CLI and use an account allowed to create Cloud Run, Cloud Storage, IAM, and Secret Manager resources:

~~~powershell
gcloud auth login
gcloud auth application-default login
~~~

Application Default Credentials let the local Python training command upload its artifact.

### 2. Define deployment values

Replace every placeholder. These values exist only in the current PowerShell session, and the bucket name must be globally unique.

~~~powershell
$env:GCP_PROJECT = "<gcp-project-id>"
$env:GCP_REGION = "<gcp-region>"
$env:CLOUD_RUN_SERVICE = "<cloud-run-service>"
$env:MODEL_BUCKET = "<globally-unique-model-artifact-bucket>"
$env:CLOUD_RUN_SA_NAME = "<runtime-service-account-name>"
$env:API_SECRET_NAME = "<api-key-secret-name>"
$env:FRONTEND_ORIGIN = "https://<frontend-domain>"
$env:CLOUD_RUN_SA = "${env:CLOUD_RUN_SA_NAME}@${env:GCP_PROJECT}.iam.gserviceaccount.com"
$env:GCLOUD_ACCOUNT = (gcloud config get-value account)

gcloud config set project $env:GCP_PROJECT
~~~

MODEL_BUCKET, CLOUD_RUN_SA_NAME, API_SECRET_NAME, and FRONTEND_ORIGIN are command variables, not additional application environment variables.

### 3. Enable Google Cloud APIs

~~~powershell
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com storage.googleapis.com secretmanager.googleapis.com
~~~

### 4. Create storage and runtime identity

Run this once for a new environment:

~~~powershell
gcloud storage buckets create "gs://$env:MODEL_BUCKET" --project $env:GCP_PROJECT --location $env:GCP_REGION --uniform-bucket-level-access --pap

gcloud iam service-accounts create $env:CLOUD_RUN_SA_NAME --project $env:GCP_PROJECT --display-name "Cloud Run application runtime"

gcloud iam service-accounts add-iam-policy-binding $env:CLOUD_RUN_SA --project $env:GCP_PROJECT --member "user:$env:GCLOUD_ACCOUNT" --role "roles/iam.serviceAccountUser"

gcloud storage buckets add-iam-policy-binding "gs://$env:MODEL_BUCKET" --member "serviceAccount:$env:CLOUD_RUN_SA" --role "roles/storage.objectViewer"
~~~

The Cloud Run identity receives read-only artifact access. The local operator running training must have permission to upload objects to this bucket.

### 5. Store API_KEYS in Secret Manager

Enter a strong key when prompted. It is not written to a source file:

~~~powershell
$apiKey = Read-Host "Enter a strong backend API key"
$apiKey | gcloud secrets create $env:API_SECRET_NAME --project $env:GCP_PROJECT --replication-policy automatic --data-file=-
Remove-Variable apiKey

gcloud secrets add-iam-policy-binding $env:API_SECRET_NAME --project $env:GCP_PROJECT --member "serviceAccount:$env:CLOUD_RUN_SA" --role "roles/secretmanager.secretAccessor"
~~~

If the secret already exists, add a version instead:

~~~powershell
$apiKey = Read-Host "Enter the replacement backend API key"
$apiKey | gcloud secrets versions add $env:API_SECRET_NAME --project $env:GCP_PROJECT --data-file=-
Remove-Variable apiKey
~~~

### 6. Train locally and upload the artifact

From the **backend** directory:

~~~powershell
.\.venv\Scripts\Activate.ps1
$env:DEFAULT_CSV_PATH = "data/Simulation_Data.csv"
$env:GCS_CACHE_BUCKET = $env:MODEL_BUCKET
python -m app.ml.train
~~~

Verify that a v13 artifact exists:

~~~powershell
gcloud storage ls "gs://$env:MODEL_BUCKET/model-cache/v13_model_bundle_*.joblib"
~~~

Do not modify Simulation_Data.csv between training and deployment. Its content fingerprint is part of the artifact identity.

### 7. Deploy the local source

~~~powershell
gcloud run deploy $env:CLOUD_RUN_SERVICE --project $env:GCP_PROJECT --region $env:GCP_REGION --source . --service-account $env:CLOUD_RUN_SA --allow-unauthenticated --set-env-vars "ENFORCE_HTTPS=true,ALLOWED_ORIGINS=$env:FRONTEND_ORIGIN,ENABLE_DOCS=false,RATE_LIMIT_PER_MIN=60,GCS_CACHE_BUCKET=$env:MODEL_BUCKET,DEFAULT_CSV_PATH=data/Simulation_Data.csv,TRUST_PROXY_HEADERS=true" --set-secrets "API_KEYS=${env:API_SECRET_NAME}:latest"
~~~

Public invocation lets the frontend proxy reach Cloud Run; application routes remain protected by API_KEYS. For an IAM-private service, remove --allow-unauthenticated and configure the caller with Cloud Run IAM authentication.

### 8. Alternative: configure runtime variables in the web console

After the service exists, users can manage its server-side configuration without putting infrastructure values in a command or source file:

1. Open [Google Cloud Console → Cloud Run](https://console.cloud.google.com/run).
2. Select the correct project, then open the target service.
3. Click **Edit and deploy new revision**.
4. Open **Container(s) → Variables & Secrets**.
5. Under **Environment variables**, add the complete production configuration below. These are listed explicitly so a new revision does not depend on implicit defaults:

   | Name | Value |
   | --- | --- |
   | `ENFORCE_HTTPS` | `true` |
   | `ALLOWED_ORIGINS` | Production frontend origin, for example `https://<frontend-domain>` |
   | `ENABLE_DOCS` | `false` |
   | `RATE_LIMIT_PER_MIN` | `60` |
   | `GCS_CACHE_BUCKET` | Name of the private model-artifact bucket |
   | `DEFAULT_CSV_PATH` | `data/Simulation_Data.csv` |
   | `TRUST_PROXY_HEADERS` | `true` |

   Optional tuning variables such as `MAX_CONTENT_LENGTH_BYTES` and `LOG_LEVEL` may be added when their source defaults are not suitable. Do not add `PORT`; Cloud Run supplies it automatically.

6. Do not enter the API key as a plain environment-variable value. In the same **Variables & Secrets** tab, click **Reference a secret** and configure:

   | Field | Value |
   | --- | --- |
   | Environment variable name | `API_KEYS` |
   | Secret | The Secret Manager secret created for the backend API key |
   | Version | Select the intended enabled version |

7. In the revision's **Security** settings, select the runtime service account that has `Storage Object Viewer` access to the artifact bucket and `Secret Manager Secret Accessor` access to the API-key secret.
8. Click **Deploy**. Cloud Run creates a new revision; verify its health before moving all traffic or deleting an older artifact.

Cloud Run supplies `PORT` automatically. Do not add `GOOGLE_APPLICATION_CREDENTIALS`; the service uses its assigned runtime identity to access GCS and Secret Manager. See Google's guides for [service environment variables](https://cloud.google.com/run/docs/configuring/services/environment-variables) and [secret references](https://cloud.google.com/run/docs/configuring/services/secrets).

### 9. Verify the revision

~~~powershell
$serviceUrl = gcloud run services describe $env:CLOUD_RUN_SERVICE --project $env:GCP_PROJECT --region $env:GCP_REGION --format "value(status.url)"
Invoke-RestMethod "$serviceUrl/health"
~~~

If startup fails:

~~~powershell
gcloud run services logs read $env:CLOUD_RUN_SERVICE --project $env:GCP_PROJECT --region $env:GCP_REGION --limit 100
~~~

A missing-artifact error means the deployed CSV fingerprint has no matching v13 object in the configured bucket. Keep the previous production artifact until the new revision is serving successfully.

Official references: [Cloud Run source deployment](https://cloud.google.com/run/docs/deploying-source-code), [Cloud Storage bucket creation](https://cloud.google.com/storage/docs/creating-buckets), and [Secret Manager setup](https://cloud.google.com/secret-manager/docs/create-secret-quickstart).

## Common Errors

| Status | Cause |
| --- | --- |
| `401` | Missing or invalid API key |
| `409` | Data or model is not ready |
| `413` | Request body exceeds the limit |
| `422` | Invalid input |
| `429` | Rate limit exceeded |
| startup failure | Missing, corrupt, version-mismatched, or CSV-mismatched model artifact |
| `500` | Internal processing error |
