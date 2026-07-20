# Backend Service

FastAPI backend designed for Google Cloud Run. Runtime implementation lives under `app/`; root Python files remain compatibility entrypoints for existing deployment commands.

## Technology and Model

- FastAPI, Uvicorn, and Pydantic.
- Random Forest for KPIs predicted from simulation data.
- STAR-FARM formulas for financial metrics and emission intensity.
- Local or Google Cloud Storage model cache.
- API-key authentication, CORS allowlist, rate limiting, and request-body limiting.

## Local Development

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements-dev.txt
Copy-Item .env.example .env
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

| Name | Default | Purpose |
| --- | --- | --- |
| `API_KEYS` | required | Comma-separated API keys |
| `DEFAULT_CSV_PATH` | `data/Simulation_Data.csv` | Simulation dataset |
| `MODEL_CACHE_DIR` | OS temporary directory | Local model cache |
| `GCS_CACHE_BUCKET` | empty | Shared model-cache bucket |
| `ALLOWED_ORIGINS` | restricted | Comma-separated CORS origins |
| `RATE_LIMIT_PER_MIN` | source default | Requests allowed per client per minute |
| `MAX_CONTENT_LENGTH_BYTES` | `2097152` | Maximum request-body size |
| `TRUST_PROXY_HEADERS` | `false` | Trust client IP headers from a proxy |
| `ENABLE_DOCS` | `false` in production | Enable Swagger and OpenAPI |
| `ENFORCE_HTTPS` | `false` | Enable configured HTTPS enforcement/HSTS |
| `PORT` | `8080` | HTTP port |

Never commit `.env`, GCP credentials, or model-cache files.

## Model Cache

The cache is versioned and automatically invalidated when model logic changes. Set `GCS_CACHE_BUCKET` to reuse models between Cloud Run instances; otherwise, `/tmp` storage is ephemeral.

## Testing and Auditing

```powershell
python -m pytest
python -m pip_audit -r requirements.txt
```

## Cloud Run Deployment

Replace the placeholders with your GCP values:

```powershell
gcloud builds submit --tag REGION-docker.pkg.dev/PROJECT/REPOSITORY/star-farm-backend:TAG .
gcloud run deploy star-farm-backend --image REGION-docker.pkg.dev/PROJECT/REPOSITORY/star-farm-backend:TAG --region REGION --platform managed
```

Provide secrets through Secret Manager or Cloud Run environment configuration, never through the Docker image.

## Common Errors

| Status | Cause |
| --- | --- |
| `401` | Missing or invalid API key |
| `409` | Data or model is not ready |
| `413` | Request body exceeds the limit |
| `422` | Invalid input |
| `429` | Rate limit exceeded |
| `500` | Internal processing error |
