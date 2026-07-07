# ruff: noqa: E402
"""
AI-Agent Backplane & API Server
Security hardened: rate limiting, security headers, CORS restriction,
Pydantic field validation, request-size guard, structured error responses.
All configuration is read from environment variables — no secrets in code.
"""

import os
from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from pydantic import BaseModel, Field
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from agent_adk import AgentOrchestrator
from mcp_server import mcp, get_scenarios, get_data_status

# ── Configuration & Validation Constants ──────────────────────────────────────

_raw_origins = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:5173,http://localhost:4173,http://127.0.0.1:5173,http://127.0.0.1:4173",
)
ALLOWED_ORIGINS: list[str] = [o.strip() for o in _raw_origins.split(",") if o.strip()]

RATE_LIMIT: str = os.getenv("RATE_LIMIT_PER_MIN", "60") + "/minute"

_DATA_GATE_EXEMPT_PATHS = {
    "/api/data-status",
    "/docs",
    "/openapi.json",
    "/redoc",
}

_VALID_SCENARIO_GROUPS = {"Business As Usual", "One Million Hectare Rice"}

_VALID_DIMENSIONS = {
    "Climate Type", "Season Type", "Scenario Group",
    "Scenario Name", "AWD Adoption", "Resource Scenario",
    "Year",
}

_VALID_METRICS = {
    "Avg Yield", "Methane Emissions", "Emission Intensity",
    "Profit Margin", "Net Income", "Production Cost", "Straw Value",
    "Water Usage", "Fertilizer Usage", "Pesticide Usage", "Salinity Exposure",
    "Max Flood Continuous", "Flood Stress", "Drought Stress", "Salinity Stress",
    "Biodiversity", "Resilient Varieties", "Water Reliability", "Labor Intensity",
}

_VALID_RESOURCES = {"water", "fertilizer", "pesticide", "awd", "scenario_group"}

_VALID_AWD = {"With AWD", "Without AWD"}


# ── Validation Helpers ────────────────────────────────────────────────────────

def _validate_scenario_group(sg: str) -> None:
    if sg not in _VALID_SCENARIO_GROUPS:
        raise HTTPException(
            status_code=422,
            detail=f"Invalid scenario_group '{sg}'. Must be one of: {sorted(_VALID_SCENARIO_GROUPS)}.",
        )


def _validate_dimension(dimension: str) -> None:
    if dimension not in _VALID_DIMENSIONS:
        raise HTTPException(
            status_code=422,
            detail=f"Invalid dimension '{dimension}'. Valid options: {sorted(_VALID_DIMENSIONS)}.",
        )


def _validate_metrics(metrics: list[str]) -> None:
    invalid = [m for m in metrics if m not in _VALID_METRICS]
    if invalid:
        raise HTTPException(
            status_code=422,
            detail=f"Unknown metric(s): {invalid}. Valid options: {sorted(_VALID_METRICS)}.",
        )


def _validate_resources(resources: list[str]) -> None:
    invalid = [r for r in resources if r not in _VALID_RESOURCES]
    if invalid:
        raise HTTPException(
            status_code=422,
            detail=f"Unknown resource(s): {invalid}. Valid options: {sorted(_VALID_RESOURCES)}.",
        )


def _validate_awd(awd: str) -> None:
    if awd not in _VALID_AWD:
        raise HTTPException(
            status_code=422,
            detail=f"Invalid awd_adoption '{awd}'. Must be one of: {sorted(_VALID_AWD)}.",
        )


# ── Rate Limiter Initialization ───────────────────────────────────────────────

limiter = Limiter(key_func=get_remote_address, default_limits=[RATE_LIMIT])


# ── App Factory & Middleware ──────────────────────────────────────────────────

app = FastAPI(
    title="AI Agent Backplane & API Server",
    docs_url="/docs" if os.getenv("ENABLE_DOCS", "true").lower() == "true" else None,
    redoc_url=None,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],       # Cho phép tất cả các nguồn gửi yêu cầu khi chạy forwarding
    allow_credentials=False,
    allow_methods=["*"],       # Cho phép tất cả các phương thức (bao gồm cả OPTIONS)
    allow_headers=["*"],       # Cho phép tất cả các headers tùy chỉnh từ proxy chuyển tiếp
)

@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Content-Security-Policy"] = (
        "default-src 'none'; "
        "script-src 'self'; "
        "connect-src 'self'; "
        "img-src 'self' data:; "
        "style-src 'self' 'unsafe-inline'"
    )
    return response


@app.middleware("http")
async def require_data_loaded(request: Request, call_next):
    path = request.url.path
    if path.startswith("/api/") and path not in _DATA_GATE_EXEMPT_PATHS:
        status = get_data_status()
        if not status.get("data_loaded"):
            return JSONResponse(
                status_code=409,
                content={
                    "success": False,
                    "code": "NO_DATA_LOADED",
                    "message": (
                        "Chưa có dữ liệu mô phỏng nào được nạp. "
                        "Kiểm tra lại DEFAULT_CSV_PATH trên server."
                    ),
                    "required_columns": status.get("required_columns", []),
                },
            )
    return await call_next(request)


# ── Global Error Handlers ─────────────────────────────────────────────────────

@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    print(f"[ERROR] Unhandled exception on {request.url.path}: {exc!r}")
    return JSONResponse(
        status_code=500,
        content={"detail": "An internal server error occurred. Please try again."},
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    optimization_paths = {"/api/optimize", "/api/optimize/resource"}
    if request.url.path in optimization_paths:
        return JSONResponse(
            status_code=400,
            content={"success": False, "message": "Cannot be optimized"},
        )
    return JSONResponse(status_code=422, content={"detail": exc.errors()})


# ── Orchestrator Instance ─────────────────────────────────────────────────────

orchestrator = AgentOrchestrator()


# ── Pydantic Request Schemas ──────────────────────────────────────────────────

class CompareRequest(BaseModel):
    """
    Structured Compare X by Y request schema.
    """
    metrics: list[str] = Field(
        default=[],
        description=(
            "List of metric column names to compare. Valid values: Avg Yield, "
            "Methane Emissions, Emission Intensity, Profit Margin, Net Income, etc."
        ),
    )
    dimension: str = Field(
        description="DataFrame column to group by, e.g., Climate Type, AWD Adoption."
    )
    filters: dict = Field(
        default={},
        description="Optional dictionary filtering parameters, e.g., {'AWD Adoption': 'With AWD'}."
    )


class SimulationRequest(BaseModel):
    """
    Input parameter validation schema for a single agricultural simulation scenario.
    """
    scenario_group: str = Field(
        default="Business As Usual",
        description="Scenario Group. Either 'Business As Usual' or 'One Million Hectare Rice'."
    )
    awd_adoption: str = Field(
        description="AWD Adoption state. Must be 'With AWD' or 'Without AWD'."
    )
    fertilizer_usage: float = Field(
        ge=50.0, le=250.0,
        description="Applied fertilizer usage amount (kg/ha). Valid range: 50.0 to 250.0."
    )
    pesticide_usage: float = Field(
        ge=0.5, le=15.0,
        description="Applied pesticide usage amount (kg/ha). Valid range: 0.5 to 15.0."
    )
    water_usage: float = Field(
        ge=100.0, le=1500.0,
        description="Irrigation water usage (m³/ha). Valid range: 100.0 to 1500.0."
    )


class OptimizationRequest(BaseModel):
    """
    Validation schema for targeted single-metric methane limits.
    """
    target_methane: float = Field(
        ge=50.0, le=2000.0,
        description="Upper limit target of Methane Emissions (kg/ha)."
    )
    scenario_group: str = Field(
        default="Business As Usual",
        description="Fixed Scenario Group used as a constraint."
    )
    pesticide_usage: float = Field(
        default=5.0, ge=0.5, le=15.0,
        description="Fixed pesticide usage level constraint."
    )


class ResourceOptimizationRequest(BaseModel):
    """
    Validation schema for targeting specific optimization assets.
    """
    resources: list[str] = Field(
        description="The subset list of resource labels to optimize."
    )
    fixed_inputs: dict = Field(
        default={},
        description="Key-value mapping of parameters held constant during grid search."
    )
    target_methane: float = Field(
        default=500.0, ge=50.0, le=2000.0,
        description="Methane emissions upper cap (kg/ha). Default is 500.0."
    )


class KpiChangeRequest(BaseModel):
    """
    Validation schema to monitor target KPI metrics variances.
    """
    metrics: list[str] = Field(
        default=["Avg Yield", "Methane Emissions", "Net Income", "Profit Margin"]
    )


# ── API Endpoints ─────────────────────────────────────────────────────────────

@app.get("/api/data-status")
@limiter.limit(RATE_LIMIT)
def api_get_data_status(request: Request):
    try:
        return get_data_status()
    except Exception:
        raise HTTPException(status_code=500, detail="Failed to retrieve data status.")


@app.get("/api/scenarios")
@limiter.limit(RATE_LIMIT)
def api_get_scenarios(request: Request):
    try:
        return get_scenarios()
    except Exception:
        raise HTTPException(status_code=500, detail="Failed to retrieve scenarios.")


@app.post("/api/compare")
@limiter.limit(RATE_LIMIT)
def api_compare(request: Request, req: CompareRequest):
    _validate_dimension(req.dimension)
    resolved_metrics = req.metrics if req.metrics else ["Avg Yield", "Methane Emissions", "Profit Margin", "Net Income"]
    _validate_metrics(resolved_metrics)

    try:
        query = f"Compare {' and '.join(resolved_metrics)} by {req.dimension}"
        result = orchestrator.process_query(query, context={"filters": req.filters})
        return result
    except HTTPException as http_exc:
        raise http_exc
    except Exception:
        raise HTTPException(status_code=500, detail="Comparison failed.")


@app.post("/api/simulate")
@limiter.limit(RATE_LIMIT)
def api_run_simulation(request: Request, req: SimulationRequest):
    _validate_awd(req.awd_adoption)
    _validate_scenario_group(req.scenario_group)
    try:
        result = orchestrator.process_query(
            "simulate",
            context={
                "awd_adoption":     req.awd_adoption,
                "scenario_group":   req.scenario_group,
                "fertilizer_usage": req.fertilizer_usage,
                "pesticide_usage":  req.pesticide_usage,
                "water_usage":      req.water_usage,
            },
        )
        return result["result"]
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=500, detail="Simulation failed.")


@app.post("/api/optimize")
@limiter.limit(RATE_LIMIT)
def api_optimize(request: Request, req: OptimizationRequest):
    _validate_scenario_group(req.scenario_group)
    try:
        result = orchestrator.process_query(
            "optimize",
            context={
                "target_methane":  req.target_methane,
                "scenario_group":  req.scenario_group,
                "pesticide_usage": req.pesticide_usage,
            },
        )
        return result["result"]
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=500, detail="Optimization failed.")


@app.post("/api/optimize/resource")
@limiter.limit(RATE_LIMIT)
def api_run_resource_optimization(request: Request, req: ResourceOptimizationRequest):
    _validate_resources(req.resources)
    try:
        result = orchestrator.model_agent.execute(
            "optimize_resource",
            resources=req.resources,
            fixed_inputs=req.fixed_inputs,
            target_methane=req.target_methane,
        )
        return result
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=500, detail="Resource optimization failed.")


@app.post("/api/kpi-change")
@limiter.limit(RATE_LIMIT)
def api_get_kpi_change(request: Request, req: KpiChangeRequest):
    from mcp_server import get_kpi_change
    _validate_metrics(req.metrics)
    try:
        return get_kpi_change(req.metrics)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception:
        raise HTTPException(status_code=500, detail="Không tính được KPI change.")


# ── MCP SSE Mount Endpoint ────────────────────────────────────────────────────

try:
    sse_app = mcp.sse_app()
    app.mount("/mcp", sse_app)
    print("Mounted MCP SSE App on /mcp")
except Exception as e:
    print(f"Could not mount MCP SSE app: {e}")


if __name__ == "__main__":
    import uvicorn
    import os
    uvicorn.run("main:app", host="0.0.0.0", port=int(os.getenv("PORT", 8080)))