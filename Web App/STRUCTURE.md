# Repository Structure

This document describes the current repository. `VPS` is the only backend source tree; `frontend` is deployed to Vercel. Google Cloud Storage is optional and is not implemented by the default VPS runtime.

```text
Web App/
|-- VPS/                           FastAPI backend for VPS/Docker
|   |-- app/
|   |   |-- agents/                Request orchestration
|   |   |-- api/                   FastAPI routes, middleware, and schemas
|   |   |-- mcp/                   MCP agricultural tools
|   |   `-- ml/
|   |       |-- model_config.py    Features, limits, targets, and artifact version
|   |       |-- data.py            CSV validation and fingerprinting
|   |       |-- evaluation.py      Metrics and quality gates
|   |       |-- training.py        Offline model fitting and evaluation
|   |       |-- model_bundle.py    Models, encoders, report, and identity
|   |       |-- artifacts.py       Local artifact persistence
|   |       |-- runtime.py         Fail-fast serving-state loader
|   |       `-- train.py           Manual training entrypoint
|   |-- data/                      Simulation dataset copied into the image
|   |-- model_cache/               Mounted artifacts; generated and not committed
|   |-- tests/
|   |   |-- unit/                  Agent and artifact lifecycle tests
|   |   `-- integration/           API and MCP behavior tests
|   |-- Dockerfile                 Application image
|   |-- docker-compose.yml         Loopback port and persistent artifact mount
|   |-- setup_vps.sh               VPS setup helper
|   |-- main.py                    Compatibility application entrypoint
|   |-- agent_adk.py               Compatibility agent import alias
|   `-- mcp_server.py              Compatibility MCP import alias
|-- frontend/                      React/Vite dashboard and Vercel proxy
|   |-- api/proxy/                 Server-side authenticated backend proxy
|   |-- public/                    Static assets
|   |-- src/
|   |   |-- api/                   Browser-to-proxy request client
|   |   |-- app/                   Application shell and error boundary
|   |   |-- config/                Browser-safe configuration
|   |   |-- features/dashboard/    Components and data transformations
|   |   |-- hooks/                 State and request orchestration
|   |   |-- i18n/                  Typed translations
|   |   |-- styles/                Global and application styles
|   |   |-- types/                 Domain contracts
|   |   `-- utils/                 Browser utilities
|   `-- tests/
|       |-- unit/                  Hooks and utilities
|       |-- components/            React components
|       `-- server/                Vercel proxy behavior
|-- GCS_SETUP.md                   Optional shared GCS provisioning guide
|-- MODEL.md                       Model behavior and formulas
`-- README.md                      Web application overview
```

The repository root also contains `Data Studio guide/`, which documents the CSV-to-Looker Studio workflow and an optional GCS-based raster pipeline.

## Model Lifecycle

```text
Simulation CSV
      |
      v
manual training -> validation/evaluation -> fingerprinted ModelBundle
                                                   |
                                                   v
                                      mounted model_cache volume
                                                   |
                                                   v
                                  runtime loader -> MCP/API serving
```

- Serving never trains a model.
- The artifact must match the model version and CSV fingerprint or startup fails.
- The default VPS implementation stores artifacts only in the mounted local volume.
- Optional GCS support requires the integration work listed in [VPS documentation](./VPS/README.md#optional-use-google-cloud-storage), followed by the provisioning steps in [GCS Setup](./GCS_SETUP.md).

## Placement Rules

- Keep API and MCP protocol code under `VPS/app/api` and `VPS/app/mcp`.
- Keep data, training, evaluation, artifact, and runtime logic under `VPS/app/ml`.
- Keep serving bootstrap independent from the training module.
- Put browser features under `frontend/src/features` and Vercel function tests under `frontend/tests/server`.
- Do not commit `.env`, credentials, virtual environments, dependencies, build output, caches, or model artifacts.

## Operational Commands

Run the backend with Docker:

```powershell
cd VPS
Copy-Item .env.example .env
docker compose build api
docker compose run --rm api python -m app.ml.train
docker compose up -d
```

Verify the backend:

```powershell
cd VPS
python -m pytest
```

Verify the frontend:

```powershell
cd frontend
npm test -- --run
npm run build
```

See [VPS](./VPS/README.md), [Frontend](./frontend/README.md), and [GCS Setup](./GCS_SETUP.md) for deployment-specific configuration.
