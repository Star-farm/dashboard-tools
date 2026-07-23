# Repository Structure

This document defines the ownership of code in each deployment variant. Root entrypoints remain compatibility aliases so existing Cloud Run, VPS, Docker, and Vercel commands continue to work.

```text
Web App/
|-- backend/                       Cloud Run backend
|   |-- app/
|   |   |-- agents/                Request orchestration and optimization
|   |   |-- api/                   FastAPI routes, middleware, and schemas
|   |   |-- mcp/                   Thin MCP tool adapter
|   |   `-- ml/
|   |       |-- model_config.py    Shared schema, limits, targets, and artifact version
|   |       |-- data.py            CSV validation, normalization, and fingerprinting
|   |       |-- evaluation.py      Group-aware metrics and quality gates
|   |       |-- training.py        Offline model fitting and evaluation
|   |       |-- model_bundle.py    Packaged models, encoders, report, and identity
|   |       |-- artifacts.py       Local artifact storage and optional GCS transfer
|   |       |-- runtime.py         Fail-fast serving-state loader; never trains
|   |       `-- train.py           Manual training entrypoint
|   |-- data/                      Versioned simulation dataset
|   |-- tests/
|   |   |-- unit/                  Agent and artifact lifecycle tests
|   |   `-- integration/           API and MCP behavior tests
|   |-- main.py                    Compatibility deployment entrypoint
|   |-- agent_adk.py               Compatibility agent import alias
|   `-- mcp_server.py              Compatibility MCP import alias
|-- VPS/                           VPS backend variant
|   |-- app/
|   |   |-- agents/                Request orchestration and optimization
|   |   |-- api/                   FastAPI routes, middleware, and schemas
|   |   |-- mcp/                   Thin MCP tool adapter
|   |   `-- ml/                    Independent VPS model lifecycle modules
|   |       |-- model_config.py    Shared schema, limits, targets, and artifact version
|   |       |-- data.py            CSV validation, normalization, and fingerprinting
|   |       |-- evaluation.py      Group-aware metrics and quality gates
|   |       |-- training.py        Offline model fitting and evaluation
|   |       |-- model_bundle.py    Packaged model state
|   |       |-- artifacts.py       Local-only artifact persistence
|   |       |-- runtime.py         Fail-fast local serving loader
|   |       `-- train.py           Manual VPS training entrypoint
|   |-- data/                      Simulation dataset copied into the image
|   |-- model_cache/               Mounted runtime artifact directory; not committed
|   |-- tests/
|   |   |-- unit/                  Agent and artifact lifecycle tests
|   |   `-- integration/           API and MCP behavior tests
|   |-- Dockerfile                 VPS application image
|   |-- docker-compose.yml         Loopback port and persistent artifact mount
|   |-- main.py                    Compatibility deployment entrypoint
|   |-- agent_adk.py               Compatibility agent import alias
|   `-- mcp_server.py              Compatibility MCP import alias
`-- frontend/                      React/Vite application and Vercel proxy
    |-- api/proxy/                 Server-side authenticated backend proxy
    |-- public/                    Static public assets
    |-- src/
    |   |-- api/                   Browser-to-proxy request client
    |   |-- app/                   Application shell and error boundary
    |   |-- config/                Browser-safe configuration
    |   |-- features/dashboard/    Dashboard components and transformations
    |   |-- hooks/                 Dashboard state and request orchestration
    |   |-- i18n/                  Typed translations
    |   |-- styles/                Global and application styles
    |   |-- types/                 Domain contracts
    |   `-- utils/                 Shared browser utilities
    `-- tests/
        |-- unit/                  Hooks and utilities
        |-- components/            React UI and error-boundary behavior
        `-- server/                Vercel proxy behavior
```

## Model Lifecycle

Training and serving are separate in both backend variants:

```text
Simulation CSV
      |
      v
app.ml.train -> data validation -> training/evaluation -> ModelBundle artifact
                                                        |
                       Backend: local + optional GCS <--+
                       VPS: mounted local directory  <--+
                                                        |
                                                        v
                       runtime loader -> MCP/API serving
```

- `training.py` is imported only by the manual training command and tests.
- `runtime.py` loads a dataset and the exactly matching artifact; it never trains.
- `ModelBundle` contains models, label encoders, validation report, model version, and dataset fingerprint.
- Missing, corrupt, version-mismatched, or dataset-mismatched artifacts stop application startup.
- Backend and VPS remain independent deployment variants. Backend artifacts may use GCS; VPS artifacts are local-only.

## Placement Rules

- Keep deployable entrypoints and deployment files at each service root.
- Keep MCP decorators and protocol adaptation in `app/mcp`; do not put training there.
- Put CSV schema and normalization logic in `app/ml/data.py`.
- Put fitting and evaluation orchestration in `app/ml/training.py`.
- Put serving bootstrap in `app/ml/runtime.py`; it must not import the training module.
- Put artifact-provider differences in each variant's `app/ml/artifacts.py`.
- Put pure helper and isolated lifecycle tests in `tests/unit`.
- Put tests crossing API, data, model, filesystem, or middleware boundaries in `tests/integration`.
- Put browser components and transformations under `frontend/src/features`.
- Put Vercel function tests in `frontend/tests/server`.
- Do not commit `.env`, credentials, `.venv`, `node_modules`, build output, coverage output, pytest caches, or model artifacts.

## Operational Commands

Train Backend before starting or deploying its serving process:

```powershell
cd backend
python -m app.ml.train
```

Train VPS into its mounted artifact directory before starting serving:

```bash
cd VPS
docker compose build api
docker compose run --rm api python -m app.ml.train
docker compose up -d
```

Run Backend or VPS verification from the corresponding service directory:

```powershell
python -m pytest
```

Run frontend verification:

```powershell
cd frontend
npm run lint
npm run test:coverage
npm run build
```

See each service README for environment variables and deployment-specific setup.
