"""
AI-Agent Backplane & API Server
Security hardened: rate limiting, security headers, CORS restriction,
Pydantic field validation, request-size guard, structured error responses,
API-key authentication on all API and MCP routes.
All configuration is read from environment variables — no secrets in code.
"""

import os
import hmac
from typing import Any, Dict, List, Literal
from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from pydantic import BaseModel, Field, field_validator
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

# Stripping whitespace and trailing slashes from each configured origin
ALLOWED_ORIGINS: list[str] = [o.strip().rstrip("/") for o in _raw_origins.split(",") if o.strip()]

# Hard fail on startup if someone tries to combine wildcard origins with credentials —
# that combination silently defeats the whole CORS whitelist.
if "*" in ALLOWED_ORIGINS:
    raise RuntimeError(
        "ALLOWED_ORIGINS must not contain '*' when allow_credentials=True. "
        "List explicit origins instead."
    )

RATE_LIMIT: str = os.getenv("RATE_LIMIT_PER_MIN", "60") + "/minute"
MAX_CONTENT_LENGTH = int(os.getenv("MAX_CONTENT_LENGTH_BYTES", "2097152"))  # Default 2MB

# Whether this service actually sits behind a trusted reverse proxy / load balancer
# that overwrites (not appends to) X-Forwarded-For. On Cloud Run this is true.
# If you deploy behind an additional untrusted proxy, set this to "false".
TRUST_PROXY_HEADERS = os.getenv("TRUST_PROXY_HEADERS", "true").lower() == "true"

# API key(s) allowed to call protected routes. Comma-separated to support rotation
# (add the new key, deploy, migrate callers, then remove the old key).
_raw_api_keys = os.getenv("API_KEYS", "")
API_KEYS: set[str] = {k.strip() for k in _raw_api_keys.split(",") if k.strip()}

if not API_KEYS:
    # Fail loudly rather than silently running an unauthenticated server.
    raise RuntimeError(
        "No API_KEYS configured. Set the API_KEYS environment variable "
        "(comma-separated) before starting the server."
    )

_DATA_GATE_EXEMPT_PATHS = {
    "/api/data-status",
    "/docs",
    "/openapi.json",
    "/redoc",
}

# Routes that do not require an API key even though they live under a protected
# prefix. Health checks need to stay reachable by uptime monitors / keep-alive pings.
_AUTH_EXEMPT_PATHS = {
    "/",
    "/health",
    "/docs",
    "/openapi.json",
    "/redoc",
}

# Prefixes that require a valid API key on every request.
_AUTH_PROTECTED_PREFIXES = ("/api/", "/mcp")

# Valid value sets for Pydantic field validation
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

# Explicit Literal types to enforce strict validation
ScenarioGroupType = Literal["Business As Usual", "One Million Hectare Rice"]
AwdAdoptionType = Literal["With AWD", "Without AWD"]


# ── Rate Limiter Helpers ──────────────────────────────────────────────────────

def get_secure_client_ip(request: Request) -> str:
    """
    Extract the real client IP from the X-Forwarded-For header only when the
    app is known to sit behind a trusted proxy that overwrites (rather than
    appends to) the header. Otherwise clients could spoof X-Forwarded-For to
    bypass rate limiting entirely, so fall back to the socket peer address.
    """
    if TRUST_PROXY_HEADERS:
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            return forwarded.split(",")[0].strip()
    return get_remote_address(request)


limiter = Limiter(key_func=get_secure_client_ip, default_limits=[RATE_LIMIT])


# ── Auth Helper ────────────────────────────────────────────────────────────────

def _is_valid_api_key(candidate: str | None) -> bool:
    if not candidate:
        return False
    # Constant-time compare against each configured key to avoid timing side channels.
    return any(hmac.compare_digest(candidate, key) for key in API_KEYS)


# ── App Factory ───────────────────────────────────────────────────────────────

app = FastAPI(
    title="AI Agent Backplane & API Server",
    docs_url="/docs" if os.getenv("ENABLE_DOCS", "false").lower() == "true" else None,
    redoc_url=None,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Configure CORS based on ALLOWED_ORIGINS
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS if ALLOWED_ORIGINS else ["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "X-Requested-With", "X-API-Key"],
)


# ── Custom Middlewares ────────────────────────────────────────────────────────

@app.middleware("http")
async def require_api_key(request: Request, call_next):
    """
    Enforce API-key authentication on every protected route, including the
    MCP SSE mount. This runs before the data-gate and business-logic
    middlewares so unauthenticated callers never reach them.
    """
    path = request.url.path

    if path in _AUTH_EXEMPT_PATHS:
        return await call_next(request)

    if path.startswith(_AUTH_PROTECTED_PREFIXES):
        # CORS preflight requests never carry custom headers/credentials; let them through.
        if request.method == "OPTIONS":
            return await call_next(request)

        provided = request.headers.get("X-API-Key") or request.headers.get("Authorization", "").removeprefix("Bearer ").strip()
        if not _is_valid_api_key(provided):
            return JSONResponse(
                status_code=401,
                content={"detail": "Missing or invalid API key."},
            )

    return await call_next(request)


@app.middleware("http")
async def limit_request_size(request: Request, call_next):
    """
    Prevent large payload delivery to mitigate DoS attacks.
    """
    if request.method in ("POST", "PUT", "PATCH"):
        content_length_str = request.headers.get("content-length")
        if content_length_str:
            try:
                content_length = int(content_length_str)
                if content_length > MAX_CONTENT_LENGTH:
                    return JSONResponse(
                        status_code=413,
                        content={"detail": "Payload too large. Request body limit exceeded."}
                    )
            except ValueError:
                return JSONResponse(
                    status_code=400,
                    content={"detail": "Invalid Content-Length header."}
                )
    return await call_next(request)


@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    """
    Set standard HTTP security headers to mitigate common vulnerabilities.
    """
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Content-Security-Policy"] = "default-src 'self'; frame-ancestors 'none';"

    # Enable HSTS only in production environments where HTTPS is enforced
    if os.getenv("ENFORCE_HTTPS", "false").lower() == "true":
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"

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
                        "No simulation data has been loaded. "
                        "Please verify DEFAULT_CSV_PATH on the server."
                    ),
                    "required_columns": status.get("required_columns", []),
                },
            )
    return await call_next(request)


# ── Global Error Handlers ─────────────────────────────────────────────────────

@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    # Log detailed internal errors while keeping response messages generic for clients.
    # NOTE: route your Cloud Run logs to a sink with restricted access — repr(exc) can
    # include fragments of request data that triggered the failure.
    print(f"[ERROR] Unhandled exception on {request.url.path}: {exc!r}")
    return JSONResponse(
        status_code=500,
        content={"detail": "An internal server error occurred. Please try again later."},
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


# ── Pydantic Request Schemas with Built-In Validation ─────────────────────────

class CompareRequest(BaseModel):
    metrics: List[str] = Field(
        default=[],
        description="List of metric column names to compare. If empty, default metrics will be used."
    )
    dimension: str = Field(
        description="DataFrame column to group by, e.g., Climate Type, AWD Adoption."
    )
    filters: Dict[str, Any] = Field(
        default={},
        description="Optional dictionary filtering parameters, e.g., {'AWD Adoption': 'With AWD'}."
    )

    @field_validator("dimension")
    @classmethod
    def validate_dimension(cls, v: str) -> str:
        if v not in _VALID_DIMENSIONS:
            raise ValueError(f"Invalid dimension. Valid options: {sorted(_VALID_DIMENSIONS)}")
        return v

    @field_validator("metrics")
    @classmethod
    def validate_metrics(cls, v: List[str]) -> List[str]:
        if not v:
            return v
        invalid = [m for m in v if m not in _VALID_METRICS]
        if invalid:
            raise ValueError(f"Unknown metric(s): {invalid}. Valid options: {sorted(_VALID_METRICS)}")
        return v


class SimulationRequest(BaseModel):
    scenario_group: ScenarioGroupType = Field(
        default="Business As Usual",
        description="Scenario Group. Either 'Business As Usual' or 'One Million Hectare Rice'."
    )
    awd_adoption: AwdAdoptionType = Field(
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
    target_methane: float = Field(
        ge=50.0, le=2000.0,
        description="Upper limit target of Methane Emissions (kg/ha)."
    )
    scenario_group: ScenarioGroupType = Field(
        default="Business As Usual",
        description="Fixed Scenario Group used as a constraint."
    )
    pesticide_usage: float = Field(
        default=5.0, ge=0.5, le=15.0,
        description="Fixed pesticide usage level constraint."
    )


class ResourceOptimizationRequest(BaseModel):
    resources: List[str] = Field(
        description="The subset list of resource labels to optimize."
    )
    fixed_inputs: Dict[str, Any] = Field(
        default={},
        description="Key-value mapping of parameters held constant during grid search."
    )
    target_methane: float = Field(
        default=500.0, ge=50.0, le=2000.0,
        description="Methane emissions upper cap (kg/ha). Default is 500.0."
    )

    @field_validator("resources")
    @classmethod
    def validate_resources(cls, v: List[str]) -> List[str]:
        invalid = [r for r in v if r not in _VALID_RESOURCES]
        if invalid:
            raise ValueError(f"Unknown resource(s): {invalid}. Valid options: {sorted(_VALID_RESOURCES)}")
        return v


class KpiChangeRequest(BaseModel):
    metrics: List[str] = Field(
        default=["Avg Yield", "Methane Emissions", "Net Income", "Profit Margin"]
    )

    @field_validator("metrics")
    @classmethod
    def validate_metrics(cls, v: List[str]) -> List[str]:
        invalid = [m for m in v if m not in _VALID_METRICS]
        if invalid:
            raise ValueError(f"Unknown metric(s): {invalid}. Valid options: {sorted(_VALID_METRICS)}")
        return v


# ── API Endpoints ─────────────────────────────────────────────────────────────

@app.get("/health")
def health_check():
    """Unauthenticated liveness probe for uptime monitors / keep-alive pings.
    Deliberately returns no dataset information."""
    return {"status": "ok"}


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
    resolved_metrics = req.metrics if req.metrics else ["Avg Yield", "Methane Emissions", "Profit Margin", "Net Income"]
    try:
        result = orchestrator.process_query("compare", context={
            "metrics": resolved_metrics,
            "dimension": req.dimension,
            "filters": req.filters,
        })
        return result
    except HTTPException as http_exc:
        raise http_exc
    except Exception:
        raise HTTPException(status_code=500, detail="Comparison failed.")


@app.post("/api/simulate")
@limiter.limit(RATE_LIMIT)
def api_run_simulation(request: Request, req: SimulationRequest):
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
    try:
        return get_kpi_change(req.metrics)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception:
        raise HTTPException(status_code=500, detail="Failed to calculate KPI change.")


# ── MCP SSE Mount Endpoint ────────────────────────────────────────────────────
# NOTE: this mount is now covered by require_api_key above (path startswith "/mcp"),
# so every SSE connection must present a valid API key before reaching FastMCP.
# It is intentionally NOT covered by the slowapi @limiter.limit decorators (those
# only apply to the individual @app.get/@app.post routes above); if you need
# per-request throttling on MCP traffic too, add a dedicated rate-limit check
# inside require_api_key or require_data_loaded for paths starting with "/mcp".

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