# AI Agent Backplane & API Server

Backend for an agricultural (rice) farming simulation & optimization app, made of 3 main components:

- **`main.py`** — FastAPI server: API-key auth, rate limiting, CORS, security headers, and the REST endpoints.
- **`agent_adk.py`** — Agent orchestrator: routes requests to two agents (`AggregationAgent` for comparisons/stats, `ModelingAgent` for simulation/optimization) built on top of the trained models.
- **`mcp_server.py`** — MCP server: loads the CSV, trains a RandomForest per prediction target, and exposes tools both via MCP (`/mcp`) and as plain functions called directly by FastAPI.

Data and model cache are stored **locally on the VPS** (no longer dependent on GCS).

---

## Architecture & data flow

```
Client ──▶ FastAPI (main.py)
             │  ├─ require_api_key      (401 if X-API-Key missing/invalid)
             │  ├─ limit_request_size   (413 if payload > MAX_CONTENT_LENGTH_BYTES)
             │  ├─ add_security_headers
             │  ├─ require_data_loaded  (409 if no dataset loaded yet)
             │  └─ CORSMiddleware       (outermost)
             │
             ├─▶ agent_adk.AgentOrchestrator ──▶ mcp_server (models, data)
             └─▶ /mcp  (FastMCP SSE mount, also protected by require_api_key)
```

**Important:** `mcp_server.py` trains models at **module import time** (cold start), not on the first request. This means `DEFAULT_CSV_PATH` must point to a valid CSV file *before* the container starts. Otherwise every `/api/*` endpoint (except `/api/data-status`) will return `409 NO_DATA_LOADED` until you provide valid data.

Model caching happens in two layers:
1. **Local VPS disk cache** (`MODEL_CACHE_DIR`, keyed by an MD5 fingerprint of the CSV file's content) — reloading the same CSV later skips retraining.
2. If no cache exists, or loading the cache fails → models are retrained from scratch with `RandomForestRegressor` for each target in `PREDICTION_TARGETS` (any target with fewer than `MIN_ROWS_PER_TARGET` = 10 valid rows is skipped).

---

## ⚠️ Dataset is baked into the Docker image

Unlike a typical setup where data is bind-mounted from the host, **this project bakes `Simulation_Data.csv` directly into the Docker image at build time**. `Dockerfile`'s `COPY . .` picks up `./data/Simulation_Data.csv` from the build context, so:

- **`./data/Simulation_Data.csv` must exist locally, in the project directory, before you run `docker compose build`.** It is not fetched or mounted at runtime.
- `_dockerignore` deliberately does **not** exclude `data/` (unlike `model_cache/`, which stays runtime-only) — otherwise the CSV would never make it into the build context.
- `docker-compose.yml` does **not** mount a volume over `/app/data`. This is intentional: mounting `./data:/app/data` would shadow the CSV already baked into the image with whatever (possibly empty) directory exists on the host at that path.
- To ship a new/updated dataset, replace `./data/Simulation_Data.csv` locally and **rebuild the image** (`docker compose build`) — there's no way to update it without a rebuild, since it's part of the image layer, not external state.
- Be mindful this increases image size and means the raw dataset travels with every image push to a registry; treat the image with the same access control you'd give the raw data.

The required schema (columns, valid categorical values, minimum row count) is defined in `mcp_server.py` (`REQUIRED_COLUMNS`, `validate_csv_schema`) and can also be inspected at runtime via `GET /api/data-status` — the `required_columns` field is returned even when no dataset is loaded yet.

---

## Directory structure

```
.
├── main.py
├── agent_adk.py
├── mcp_server.py
├── requirements.txt
├── Dockerfile
├── docker-compose.yml
├── _dockerignore          # rename to .dockerignore
├── _env.example_VPS       # rename/copy to .env
├── setup_vps.sh
├── data/                  # NOT bind-mounted — Simulation_Data.csv here gets baked into the image at build time
└── model_cache/           # bind-mount, NOT committed — trained model .joblib cache
```

> `_dockerignore` and `_env.example_VPS` are prefixed with `_` because the original upload system didn't allow filenames starting with a dot. Rename them back to `.dockerignore` and `.env` for a real deployment (see Setup below).

---

## VPS setup (first-time deploy)

### 1. Add your dataset to the build context

Copy your CSV file to `./data/Simulation_Data.csv` **in the project directory** (not directly on some separate data path on the VPS) — this is what gets baked into the image when you build. Make sure it matches the schema described above.

### 2. Prepare directories & config files

```bash
mv _dockerignore .dockerignore
chmod +x setup_vps.sh
./setup_vps.sh
```

`setup_vps.sh` automatically:
- Warns if `./data/Simulation_Data.csv` is missing from the build context
- Creates `./model_cache` and `chown`s it to **uid 8888** — matching the `appuser` user running inside the container (bind mounts don't inherit the `chown` done inside the Dockerfile; it has to be set from the host side)
- Copies `_env.example_VPS` → `.env` if `.env` doesn't exist yet

### 3. Edit `.env`

Open `.env` (created from `_env.example_VPS`) and set the following correctly for your environment:

| Variable | Meaning | Notes |
|---|---|---|
| `API_KEYS` | Valid API key(s), comma-separated | **Must be changed** from the placeholder `your_vps_private_secure_key_here`. The server refuses to start if this is empty. |
| `ALLOWED_ORIGINS` | Frontend domain(s) allowed via CORS | Defaults to `https://star-farm.vercel.app` — change if your frontend domain differs. |
| `ENFORCE_HTTPS` | Enables the HSTS header | Only set to `true` if the VPS already has real SSL (nginx + certbot, etc.) in front of it. If not, keep `false`, or the browser will be forced to always use HTTPS and break the connection. |
| `ENABLE_DOCS` | Enables Swagger UI at `/docs` | Should be `false` in production. |
| `RATE_LIMIT_PER_MIN` | Requests/minute/IP limit | Defaults to `60`. |
| `DEFAULT_CSV_PATH` | CSV path inside the container | Defaults to `/app/data/Simulation_Data.csv`, matching the `./data:/app/data` volume mount. |
| `MODEL_CACHE_DIR` | Model cache directory inside the container | Defaults to `/app/model_cache`, matching the `./model_cache:/app/model_cache` volume mount. |
| `TRUST_PROXY_HEADERS` | Whether to trust the `X-Forwarded-For` header | Not present in the example file (defaults to `true`). If the container is exposed directly to the internet **without** a reverse proxy in front, set `TRUST_PROXY_HEADERS=false`, otherwise clients could spoof their IP to bypass rate limiting. |

### 4. Build & run

```bash
docker compose up -d --build
docker compose logs -f
```

Any time you replace `./data/Simulation_Data.csv`, you must rebuild the image (`docker compose up -d --build`) for the new data to take effect — restarting alone (`docker compose restart`) won't pick it up, since the CSV lives inside the image layer, not on a mounted volume.

Expected log output on success:
```
[mcp_server] Automatically loaded /app/data/Simulation_Data.csv (... rows, models: [...]).
[mcp_server] Saved model cache locally to VPS: /app/model_cache/<fingerprint>.joblib
Mounted MCP SSE App on /mcp
```

On subsequent restarts (same CSV file), the log should show `Loaded models from local VPS cache: ...` instead of retraining. If you don't see that line, `model_cache` most likely has incorrect write permissions — rerun `setup_vps.sh` or `chown` it manually.

---

## API Endpoints

Every route under `/api/*` and `/mcp` requires an `X-API-Key: <key>` header (or `Authorization: Bearer <key>`), except `/api/data-status`.

| Method | Path | Description |
|---|---|---|
| GET | `/health` | Liveness check, no auth required, exposes no dataset info. |
| GET | `/api/data-status` | Current dataset/model load status, no auth required. |
| GET | `/api/scenarios` | Lists the available scenario groups, seasons, climate types, AWD options, etc. |
| POST | `/api/compare` | Compare metrics grouped by a single dimension (`Climate Type`, `Season Type`, `Year`, ...). |
| POST | `/api/simulate` | Predict outcomes for one input combination (AWD, fertilizer, pesticide, water usage...). |
| POST | `/api/optimize` | Find the best AWD/fertilizer/water combination under a methane emissions cap. |
| POST | `/api/optimize/resource` | Optimize over a chosen subset of resources (`water`, `fertilizer`, `pesticide`, `awd`, `scenario_group`). |
| POST | `/api/kpi-change` | Compute % KPI change between `base_year` and `target_year` for a given scenario group. |
| ANY | `/mcp` | FastMCP SSE mount — lets an agent/LLM client call the MCP tools directly (`get_data_status`, `get_scenarios`, `get_aggregated_metrics`, `run_agricultural_simulation`, `get_kpi_change`). |

All request bodies are validated with Pydantic (valid dimension/metric/resource values, fertilizer/pesticide/water usage ranges, etc.) — malformed requests return `422`, except `/api/optimize` and `/api/optimize/resource`, which return a shortened `400` with message `"Cannot be optimized"`.

---

## Local development / testing

```bash
pip install -r requirements.txt
cp _env.example_VPS .env   # then edit API_KEYS, ALLOWED_ORIGINS to point at your local frontend
mkdir -p model_cache
# place your Simulation_Data.csv at ./data/Simulation_Data.csv
python main.py
# or: uvicorn main:app --reload --port 8080
```

Run tests:
```bash
pytest
```

> Note: since `mcp_server.py` trains models at module import time, the test suite needs to set environment variables and prepare a CSV fixture **before** importing `main`/`mcp_server` (see `conftest.py`).

---

## Security / operations notes

- The container runs as a non-root user (`appuser`, uid `8888`) — see the *Setup* section to make sure write permissions on `model_cache/` match this uid.
- `Simulation_Data.csv` is baked into the image (see the dataset section above); `model_cache/` stays excluded from the build context via `.dockerignore` and is only ever populated at runtime, persisted through a volume mount.
- Because the dataset now lives inside the image, apply the same access control to your image registry that you would to the raw CSV — anyone who can pull the image can extract the data.
- If the container sits behind nginx/a reverse proxy, consider changing the port mapping in `docker-compose.yml` from `"8080:8080"` to `"127.0.0.1:8080:8080"` so it isn't exposed directly to the internet, and keep `TRUST_PROXY_HEADERS=true`.
- `generic_exception_handler` in `main.py` logs `repr(exc)` — if your log pipeline could contain request-data fragments, restrict access to that log sink accordingly.