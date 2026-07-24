# Star Farm Web App

An agricultural dashboard that simulates how farming scenarios affect yield, emissions, and financial performance.

## Project Structure

| Service | Technology | Purpose |
| --- | --- | --- |
| [`frontend`](./frontend/) | React 19, TypeScript, Vite, Recharts | Dashboard and Vercel API proxy |
| [`backend`](./backend/) | Python, FastAPI, Random Forest | Cloud Run backend |
| [`VPS`](./VPS/) | Python, FastAPI, Docker Compose | VPS backend variant |

`backend` and `VPS` are two deployment variants of the same API. A production environment normally needs only one of them.

## Data Flow

### Production architecture

```mermaid
flowchart TB
    subgraph Request[1. User request from Vercel frontend]
        direction TB
        UserAction[User changes simulation inputs]
        ReactRequest[React dashboard sends request]
        ProxyRequest[Vercel serverless proxy]
        VercelEnv[BACKEND_API_URL<br/>BACKEND_API_KEY]

        UserAction --> ReactRequest
        ReactRequest -->|/api/proxy/*| ProxyRequest
        VercelEnv -. server-side config .-> ProxyRequest
    end

    ProxyRequest -->|HTTPS and X-API-Key| Target{2. Selected deployment}

    subgraph CloudRun[Cloud Run and GCS]
        direction TB
        CRTrain[Offline training]
        CRStart[Cloud Run startup]
        CRLocal[Temporary local cache]
        GCS[Private GCS artifact bucket]
        CRLoad[Validate matching ModelBundle]
        CRAPI[Cloud Run API]

        CRTrain -->|upload artifact| GCS
        CRStart --> CRLocal
        CRLocal -->|matching artifact| CRLoad
        CRLocal -->|cache miss| GCS
        GCS -->|download matching artifact| CRLoad
        CRLoad -. enables .-> CRAPI
    end

    subgraph VPSDeployment[VPS and persistent volume]
        direction TB
        VPSTrain[Offline training on VPS]
        VPSStart[VPS container startup]
        Volume[Persistent model_cache volume]
        VPSLoad[Validate matching ModelBundle]
        VPSAPI[VPS API]

        VPSTrain -->|save artifact| Volume
        VPSStart --> Volume
        Volume -->|load matching artifact| VPSLoad
        VPSLoad -. enables .-> VPSAPI
    end

    Target -->|Cloud Run| CRAPI
    Target -->|VPS| VPSAPI

    subgraph API[3. Request processing in selected backend]
        direction TB
        Security[FastAPI security middleware]
        Routes[REST and MCP routes]
        Agent[Agent orchestrator]
        MCP[MCP agricultural tools]
        Runtime[Serving state and inference]
        Derived[Derived financial and emission metrics]
        JSON[JSON response]

        Security --> Routes
        Routes --> Agent
        Agent --> MCP
        MCP --> Runtime
        Runtime --> Derived
        Derived --> JSON
    end

    CRAPI --> Security
    VPSAPI --> Security
    CRLoad -. model state .-> Runtime
    VPSLoad -. model state .-> Runtime

    subgraph Response[4. Response to Vercel frontend]
        direction TB
        ProxyResponse[Vercel proxy receives HTTPS response]
        ReactResponse[React updates dashboard state]
        UserResult[User sees updated dashboard]

        ProxyResponse --> ReactResponse
        ReactResponse --> UserResult
    end

    JSON --> ProxyResponse
```

### Request sequence

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant React as React dashboard
    participant Proxy as Vercel proxy
    participant Backend as Selected FastAPI backend
    participant Storage as Model storage
    participant MCP as Agent and MCP tools
    participant Runtime as ML runtime

    Note over Backend,Storage: Backend startup before serving traffic
    alt Cloud Run deployment
        Backend->>Storage: Check temporary local cache
        opt Local cache miss
            Backend->>Storage: Download matching ModelBundle from GCS
        end
    else VPS deployment
        Backend->>Storage: Load ModelBundle from persistent volume
    end
    Storage-->>Backend: Validated model state

    User->>React: Change simulation inputs
    React->>Proxy: POST /api/proxy/*
    Note right of Proxy: Reads BACKEND_API_URL<br/>and BACKEND_API_KEY
    Proxy->>Backend: HTTPS request with X-API-Key
    Backend->>Backend: Authenticate and rate-limit request
    Backend->>MCP: Route simulation request
    MCP->>Runtime: Run inference
    Runtime-->>MCP: Predictions and intervals
    MCP-->>Backend: Derived KPI and chart data
    Backend-->>Proxy: JSON response
    Proxy-->>React: Response data
    React-->>User: Render updated dashboard
```

The browser never receives the backend API key. The React application calls the same-origin Vercel proxy, which reads `BACKEND_API_KEY` server-side and forwards it as `X-API-Key`. `BACKEND_API_URL` selects either the Cloud Run or VPS deployment; the selected FastAPI service compares the forwarded key with `API_KEYS` before requests reach the agent and MCP layers.

- Random Forest models predict average yield, methane emissions, revenue, and production cost.
- Training is an explicit offline command; each serving variant loads a packaged `ModelBundle` and fails startup when it is unavailable or invalid.
- Net income, profit margin, and emission intensity are derived from those predictions.
- Simulation outputs use 2050 data and average equally across the unique valid resource, season, and climate combinations for the selected scenario.
- Validation residuals provide P90 prediction intervals for the simulation chart.
- The dashboard's default KPI comparison is 2022 to 2050.

## Local Development

### 1. Start the backend

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
python -m app.ml.train
python main.py
```

The backend is available at `http://127.0.0.1:8080` by default.

### 2. Start the frontend

Open another terminal:

```powershell
cd frontend
npm install
npm run dev
```

Open the Vite URL shown in the terminal. The development proxy forwards `/api/proxy/*` to the local backend.

### Run the VPS variant with Docker

```powershell
cd VPS
Copy-Item .env.example .env
docker compose build api
docker compose run --rm api python -m app.ml.train
docker compose up -d
docker compose ps
Invoke-RestMethod http://127.0.0.1:8080/health
```

## Testing

```powershell
cd backend
python -m pytest

cd ..\VPS
python -m pytest

cd ..\frontend
npm test -- --run
npm run build
```

## Production Environment

The Vercel frontend requires at least:

```dotenv
BACKEND_API_URL=https://api.example.com
BACKEND_API_KEY=replace-with-a-strong-secret
```

The backend requires `API_KEYS`. See each service README for the complete configuration. Never store secrets in variables prefixed with `VITE_`, because those values may be included in the client bundle.

## Deployment Principles

- The production backend endpoint must use HTTPS.
- Cloud Run stores model cache in `/tmp` or Google Cloud Storage.
- The VPS container must bind to loopback and accept traffic only through a trusted reverse proxy.
- Enable `TRUST_PROXY_HEADERS` only when the proxy is controlled by you and direct backend access is impossible.
- `/health` is public; `/api/*` and `/mcp` require authentication.

## Detailed Documentation

- [Repository structure](./STRUCTURE.md)
- [Model inputs, formulas, evaluation, and P90 intervals](./MODEL.md)
- [Backend/Cloud Run](./backend/README.md)
- [Backend/VPS](./VPS/README.md)
- [Frontend/Vercel](./frontend/README.md)
