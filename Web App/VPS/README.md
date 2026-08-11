# VPS Service

The FastAPI backend variant packaged with Docker Compose for VPS deployment. Runtime implementation lives under `app/`; root Python files remain compatibility entrypoints for existing deployment commands.

## Recommended Architecture

```text
Internet -> HTTPS Nginx/Caddy -> 127.0.0.1:8080 -> Docker/FastAPI
```

Docker Compose publishes the application on loopback only. Do not expose port `8080` directly to the Internet.

## Requirements

- Docker Engine and the Docker Compose plugin.
- A domain pointing to the VPS.
- Nginx or Caddy with a valid TLS certificate.
- A strong, production-specific API key.

## Installation

On a Linux VPS:

```bash
cp .env.example .env
chmod 600 .env
docker compose build api
# Create caching folder with proper user permission
mkdir -p ./model_cache
sudo chown -R 8888:8888 ./model_cache
docker compose run --rm api python -m app.ml.train
docker compose up -d
docker compose ps
curl http://127.0.0.1:8080/health
```

View logs:

```bash
docker compose logs -f --tail=200
```

Train the model artifact before the first start and whenever the CSV or model code changes:

```bash
docker compose build api
docker compose run --rm api python -m app.ml.train
docker compose up -d
```

Rebuild after updating serving-only source code (an existing matching artifact remains valid):

```bash
docker compose up -d --build
```

## Environment Configuration

| Name | Production recommendation |
| --- | --- |
| `API_KEYS` | Long, random secrets separated by commas |
| `DEFAULT_CSV_PATH` | `/app/data/Simulation_Data.csv` |
| `MODEL_CACHE_DIR` | `/app/model_cache` |
| `ALLOWED_ORIGINS` | Frontend domains only |
| `RATE_LIMIT_PER_MIN` | Tune for the expected workload |
| `MAX_CONTENT_LENGTH_BYTES` | Keep as small as the API permits |
| `ENABLE_DOCS` | `false` |
| `ENFORCE_HTTPS` | `true` when the proxy forwards HTTPS metadata correctly |
| `TRUST_PROXY_HEADERS` | `true` only when requests can come only from a trusted proxy |

`TRUST_PROXY_HEADERS=true` is appropriate for the current setup because the container binds to `127.0.0.1` and the reverse proxy runs on the same VPS. Set it to `false` if the backend is ever exposed directly.

## Reverse Proxy Example

Minimal Nginx example:

```nginx
server {
    listen 443 ssl http2;
    server_name api.example.com;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

TLS certificate configuration depends on Certbot, Caddy, or your infrastructure provider. Never store certificate secrets in the repository.

## Authentication and Endpoints

`/health` is public. `/api/*` routes require:

```http
X-API-Key: your-production-key
```

The production frontend does not send this key from the browser. The Vercel serverless proxy stores the key server-side and attaches it when calling the VPS.

Main routes:

- `POST /api/compare`
- `POST /api/simulate`
- `POST /api/kpi-change`

## Training and Serving

- The default CSV is `data/Simulation_Data.csv` and is copied into the image.
- Training runs only through `python -m app.ml.train`; serving never trains.
- Models, encoders, validation report, model version, and CSV fingerprint are stored together in one `ModelBundle`.
- `model_cache` is mounted at `/app/model_cache`, so the artifact survives container recreation.
- Serving requires `/app/model_cache/v13_model_bundle_<csv-fingerprint>.joblib` and stops at startup if it is absent or invalid.
- By default, only `DEFAULT_CSV_PATH` and `MODEL_CACHE_DIR` are used; optional GCS support requires the implementation described below.
- Model v13 predicts average yield, methane emissions, revenue, and production cost; financial and emission ratios are derived afterward.
- Simulation outputs include validation-based P90 intervals.

See [Model Documentation](../MODEL.md) for the complete input schema, formulas, context aggregation, evaluation, and interval calculation.

## Optional: Use Google Cloud Storage

The default VPS deployment stores model artifacts in the local `model_cache` Docker volume. If remote artifact storage in GCS is required:

1. Create a private GCS bucket and a service account with `Storage Object Viewer` access. The account that trains the model also needs permission to upload objects.
2. Install `google-cloud-storage` in the application environment.
3. Add `GCS_CACHE_BUCKET=<bucket-name>` to the server configuration.
4. Extend `app/ml/artifacts.py` so training uploads artifacts to `model-cache/` in the bucket and serving downloads the matching artifact when it is absent from the local cache.
5. Pass `GCS_CACHE_BUCKET` through `app/ml/train.py`, `app/ml/runtime.py`, and `app/mcp/server.py` to the artifact storage functions.
6. Provide credentials through the runtime identity where possible. Do not commit service-account keys or place them in the container image.
7. Train the model, verify that the fingerprinted artifact exists in GCS, and test a startup with an empty local cache before using it in production.

See [GCS Setup](../GCS_SETUP.md) for bucket creation, IAM commands, environment variables, artifact verification, and Cloud Run identity configuration. The [Data Studio Guide](../../Data%20Studio%20guide/README.md) documents the separate optional GCS raster and Drive-sync workflow. Setting `GCS_CACHE_BUCKET` alone is not sufficient until the optional model-artifact integration described above has been implemented.

## Testing

Run outside the container:

```bash
python -m pytest
```

API smoke test:

```bash
curl -X POST -H "X-API-Key: YOUR_KEY" -H "Content-Type: application/json" \
  -d '{"metrics":["Avg Yield"]}' http://127.0.0.1:8080/api/kpi-change
```

## Secure Operations

- Allow only SSH, HTTP, and HTTPS through the firewall; do not open `8080`.
- Use SSH keys and install operating-system updates regularly.
- Never commit `.env` or include keys in images or logs.
- Back up required CSV data and the matching model artifact. Regenerate it manually before restarting serving when either changes.
- Rotate API keys if exposure is suspected.
- Monitor Docker logs, disk usage, and `/health`.

## Troubleshooting

```bash
docker compose ps
docker compose logs --tail=200
docker inspect fastapi_mcp_api
curl -v http://127.0.0.1:8080/health
```

- `401`: verify that the Vercel and VPS API keys match.
- `404` from the frontend proxy: verify that the route is in the proxy allowlist.
- `413`: the request exceeds the frontend or backend body limit.
- `429`: the client exceeded the rate limit.
- `502/504`: check the container, reverse proxy, DNS, and timeout settings.
- Container restart loop with `Model artifact not found` or `is invalid`: run `docker compose run --rm api python -m app.ml.train`, then start the service again.
