# AI-Agents Agricultural Modeling System

An AI-powered multi-agent system and interactive simulation dashboard designed to analyze the impacts of agricultural practices (AWD adoption, water management, fertilizer/pesticide usage) on crop yields, methane emissions, net income, and profit margins — focused on rice farming scenarios in Vietnam.

---

## 🏗️ Architecture Overview

The system consists of three main components:

### 1. Model Context Protocol (MCP) Server (`backend/mcp_server.py`)
- Loads and validates `Simulation_Data.csv` at startup (schema validation, type checks).
- Trains **Random Forest** regression models (`scikit-learn`) for **14 prediction targets**: Avg Yield, Methane Emissions, Emission Intensity, Profit Margin, Net Income, Production Cost, Straw Value, Water Reliability, Biodiversity, Resilient Varieties, Labor Intensity, Flood/Drought/Salinity Stress.
- **Model caching**: Local cache + optional GCS bucket cache for faster cold starts on Cloud Run.
- Exposes MCP tools: `get_data_status`, `get_scenarios`, `get_aggregated_metrics`, `run_agricultural_simulation`, `get_kpi_change`.

### 2. Multi-Agent System (`backend/agent_adk.py`)
- Implements an Agent Development Kit (ADK) with an **AgentOrchestrator** routing queries to:
  - **AggregationAgent** (Agricultural Statistics Analyst): Groups and aggregates historical metrics across dimensions (Climate Type, Season Type, Scenario Group, AWD Adoption, Year, etc.).
  - **ModelingAgent** (Agricultural Yield & Emission Predictor): Runs simulations, single-target optimization (methane ceiling), and multi-resource grid-search optimization.

### 3. Interactive Dashboard (`frontend/`)
- Built with **React 19**, **TypeScript**, and **Vite**.
- **Bilingual UI** (Vietnamese 🇻🇳 / English 🇬🇧) with full i18n via `translations.ts`.
- **KPI Cards**: Displays year-over-year percentage changes (2024 → 2050) for Avg Yield, Methane Emissions, Net Income, and Profit Margin.
- **Impact Comparison Chart** (`recharts`): Dual-axis bar charts toggling between Economic (Yield vs Net Income) and Environmental (Methane vs Emission Intensity) views, with simulated scenario overlay.
- **Simulation Controls**: Interactive sliders and dropdowns for Scenario Group, AWD Adoption, Fertilizer (50–250 kg/ha), Pesticide (1–15 kg/ha), and Water Usage (200–1200 m³/ha).
- **VND currency conversion** for Vietnamese locale.
- Responsive design with mobile-first layouts and glassmorphism styling.

---

## 📁 Project Structure

```
├── backend/
│   ├── main.py                # FastAPI server, middleware, API endpoints
│   ├── mcp_server.py          # MCP server, data ingestion, ML model training
│   ├── agent_adk.py           # Multi-agent orchestrator (Aggregation + Modeling)
│   ├── requirements.txt       # Python dependencies
│   ├── Dockerfile             # Docker containerization (Python 3.11)
│   ├── .env.example           # Environment variable template
│   └── data/
│       └── Simulation_Data.csv  # Agricultural simulation dataset (~6.5 MB)
│
├── frontend/
│   ├── index.html             # HTML entry point
│   ├── package.json           # Node dependencies (React 19, Recharts, Lucide)
│   ├── vite.config.ts         # Vite configuration
│   ├── .env.example           # Frontend env template (VITE_API_BASE)
│   └── src/
│       ├── main.tsx           # React entry point
│       ├── App.tsx            # Root component
│       ├── Dashboard.tsx      # Main dashboard UI
│       ├── useDashboardData.ts  # Data fetching hook & chart logic
│       ├── translations.ts   # Vietnamese / English translations
│       ├── types.ts           # TypeScript type definitions
│       ├── config.ts          # API base URL config
│       ├── ErrorBoundary.tsx  # React error boundary
│       ├── App.css            # Component styles
│       └── index.css          # Global styles & design system
│
└── README.md
```

---

## 🔌 API Endpoints

| Method | Endpoint                | Description                                                      |
|--------|-------------------------|------------------------------------------------------------------|
| GET    | `/api/data-status`      | Check if simulation data and ML models are loaded                |
| GET    | `/api/scenarios`        | List available scenario groups, seasons, climates, AWD options    |
| POST   | `/api/compare`          | Compare metrics by a dimension (e.g., Yield by Climate Type)     |
| POST   | `/api/simulate`         | Run ML predictions with custom input parameters                  |
| POST   | `/api/optimize`         | Find optimal inputs under a methane emissions ceiling            |
| POST   | `/api/optimize/resource`| Grid-search optimization for specific resources                  |
| POST   | `/api/kpi-change`       | Calculate KPI variance between base year (2024) and target (2050)|
| —      | `/mcp`                  | MCP SSE endpoint for external agent integration                  |

---

## 🛡️ Security Features

- **Rate Limiting**: Configurable per-minute rate limits via `slowapi`.
- **CORS**: Configurable allowed origins via `ALLOWED_ORIGINS` env variable.
- **Security Headers**: `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `X-XSS-Protection`, `Content-Security-Policy`.
- **Input Validation**: Pydantic schemas with field-level constraints (min/max ranges, allowed values).
- **Data Gate Middleware**: Blocks API calls if simulation data is not loaded.

---

## 🚀 Setup & Execution Instructions

### 1. Backend Setup

The backend runs on **Python 3.11+**.

1. **Navigate to the backend directory**:
   ```bash
   cd backend
   ```

2. **Create a virtual environment (recommended)**:
   ```bash
   python -m venv .venv
   ```

3. **Activate the virtual environment**:
   - **Windows (PowerShell)**:
     ```powershell
     .venv\Scripts\Activate.ps1
     ```
   - **Windows (CMD)**:
     ```cmd
     .venv\Scripts\activate.bat
     ```
   - **macOS / Linux**:
     ```bash
     source .venv/bin/activate
     ```

4. **Install backend dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

5. **Configure environment variables** (optional):
   ```bash
   cp .env.example .env
   ```
   Key variables:
   - `ALLOWED_ORIGINS` — comma-separated CORS origins
   - `ENABLE_DOCS` — set to `true` to enable `/docs` (Swagger UI)
   - `DEFAULT_CSV_PATH` — path to simulation data CSV (default: `data/Simulation_Data.csv`)
   - `GCS_CACHE_BUCKET` — optional GCS bucket for model cache persistence

6. **Start the FastAPI backend server**:
   ```bash
   python main.py
   ```
   The backend server will start at **`http://localhost:8080`**. The MCP SSE endpoint is exposed under `/mcp`.

---

### 2. Frontend Setup

The frontend is a **React + TypeScript + Vite** application.

1. **Navigate to the frontend directory**:
   ```bash
   cd frontend
   ```

2. **Install Node dependencies**:
   ```bash
   npm install
   ```

3. **Configure environment variables** (optional):
   ```bash
   cp .env.example .env
   ```
   Key variable:
   - `VITE_API_BASE` — Backend API URL (default: `http://localhost:8000/api`)

4. **Run the frontend development server**:
   ```bash
   npm run dev
   ```
   The dashboard will be available at **`http://localhost:5173`**.

---

### 3. Docker (Backend Only)

```bash
cd backend
docker build -t agri-backend .
docker run -p 8080:8080 agri-backend
```

---

## 🧰 Tech Stack

| Layer     | Technology                                            |
|-----------|-------------------------------------------------------|
| Backend   | Python 3.11, FastAPI, Uvicorn, Pydantic, slowapi      |
| ML        | scikit-learn (Random Forest), pandas, NumPy            |
| MCP       | FastMCP (Model Context Protocol)                       |
| Frontend  | React 19, TypeScript, Vite, Recharts, Lucide React     |
| Deploy    | Docker, Cloud Run (optional), GCS model cache          |

---

## 💡 Key Features

- **ML-Powered Predictions**: Adjust Fertilizer, Pesticide, Water, AWD, and Scenario Group inputs to get real-time predictions for 14 agricultural indicators.
- **Dual-Axis Comparison Charts**: Toggle between Economic and Environmental metric views with simulated scenario overlays.
- **KPI Trend Analysis**: Automatically computes year-over-year changes between 2024 baseline and 2050 projections.
- **Multi-Agent Optimization**: Grid-search optimizer finds the best resource allocation meeting a methane emissions ceiling while maximizing yield and profit.
- **Bilingual Interface**: Full Vietnamese and English language support.
- **Responsive Design**: Optimized for both desktop and mobile devices.
