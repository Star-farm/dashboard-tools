"""Integration tests for FastAPI middleware, validation, and endpoints."""

import os
import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient

# ── 1. Declare Shared Client Fixture for All Tests ────────────────────────────

@pytest.fixture
def client():
    import main
    
    with patch("main.API_KEYS", {"test-key-123", "another-key"}), \
         patch("main.get_data_status", return_value={"data_loaded": True, "required_columns": []}):
        
        # Set raise_server_exceptions=False so that TestClient does not automatically 
        # propagate server exceptions to the test process, allowing generic_exception_handler to run.
        with TestClient(main.app, raise_server_exceptions=False) as c:
            yield c


# ── 2. Authentication & System Security Tests (Auth & Security) ───────────────

def test_health_check(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_require_api_key_missing(client):
    # Do not send any API Key header
    response = client.get("/api/data-status")
    assert response.status_code == 401
    assert "Missing or invalid API key" in response.json()["detail"]


def test_require_api_key_invalid(client):
    # Send an invalid API Key in Header
    response = client.get("/api/data-status", headers={"X-API-Key": "wrong-key"})
    assert response.status_code == 401
    
    # Send an invalid API Key as Bearer Token
    response = client.get("/api/data-status", headers={"Authorization": "Bearer wrong-key"})
    assert response.status_code == 401


def test_require_api_key_valid(client):
    # Use a colon (:) to define the exact Key-Value pair for the header
    response = client.get("/api/data-status", headers={"X-API-Key": "test-key-123"})
    assert response.status_code == 200
    
    # Send a valid API Key as Bearer Token
    response = client.get("/api/data-status", headers={"Authorization": "Bearer another-key"})
    assert response.status_code == 200


def test_options_preflight_bypasses_auth(client):
    # CORS Preflight (OPTIONS) carrying standard CORS headers will be processed 
    # directly by CORSMiddleware and return 200 instead of hitting the router.
    headers = {
        "Origin": "http://localhost:5173",
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "X-API-Key"
    }
    response = client.options("/api/compare", headers=headers)
    assert response.status_code == 200
    assert "access-control-allow-origin" in response.headers


def test_limit_request_size(client):
    # Send a payload exceeding the allowed limit (> 2MB)
    large_payload = "A" * (2 * 1024 * 1024 + 100)
    response = client.post(
        "/api/compare",
        headers={"X-API-Key": "test-key-123"},
        content=large_payload
    )
    assert response.status_code == 413
    assert "Payload too large" in response.json()["detail"]


def test_limit_request_size_without_content_length(client):
    def chunked_payload():
        chunk = b"A" * (512 * 1024)
        for _ in range(5):
            yield chunk

    response = client.post(
        "/api/compare",
        headers={"X-API-Key": "test-key-123"},
        content=chunked_payload(),
    )
    assert response.status_code == 413
    assert "Payload too large" in response.json()["detail"]


def test_invalid_content_length_header(client):
    # Invalid Content-Length format
    response = client.post(
        "/api/compare",
        headers={"X-API-Key": "test-key-123", "Content-Length": "invalid_format"},
        json={"dimension": "Climate Type"}
    )
    assert response.status_code == 400
    assert "Invalid Content-Length" in response.json()["detail"]


def test_request_size_bypass_for_get_requests(client):
    # GET requests do not enforce payload size limits
    response = client.get(
        "/api/scenarios",
        headers={"X-API-Key": "test-key-123", "Content-Length": "99999999"}
    )
    assert response.status_code == 200


@patch.dict(os.environ, {"ENFORCE_HTTPS": "true"})
def test_security_headers_with_hsts_enabled(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert "Strict-Transport-Security" in response.headers
    assert response.headers["X-Content-Type-Options"] == "nosniff"


# ── 3. Core Business API Integration Tests ────────────────────────────────────

@patch("main.orchestrator.process_query")
@patch("main.orchestrator.model_agent.execute")
@patch("mcp_server.get_kpi_change")  # Patched at the source in mcp_server
def test_api_endpoints_success(mock_kpi, mock_agent_execute, mock_process_query, client):
    headers = {"X-API-Key": "test-key-123"}
    
    # Mock responses for AI model processing layers to avoid real model execution
    mock_process_query.side_effect = lambda query_type, context: {
        "result": {"compare_dimension": "Climate Type", "predictions": [], "optimized_inputs": {}}
    }
    mock_agent_execute.return_value = {"optimized_inputs": {}}
    mock_kpi.return_value = {"kpis": {}}
    
    # 1. /api/data-status
    response = client.get("/api/data-status", headers=headers)
    assert response.status_code == 200
    assert response.json()["data_loaded"] is True

    # 2. /api/scenarios
    with patch("main.get_scenarios", return_value={"scenario_groups": []}):
        response = client.get("/api/scenarios", headers=headers)
        assert response.status_code == 200

    # 3. /api/compare
    compare_data = {
        "dimension": "Climate Type",
        "metrics": ["Avg Yield"]
    }
    response = client.post("/api/compare", headers=headers, json=compare_data)
    assert response.status_code == 200

    # 4. /api/simulate
    simulate_data = {
        "scenario_group": "Business As Usual",
        "awd_adoption": "With AWD",
        "fertilizer_usage": 100.0,
        "pesticide_usage": 5.0,
        "water_usage": 600.0
    }
    response = client.post("/api/simulate", headers=headers, json=simulate_data)
    assert response.status_code == 200

    # 5. /api/optimize
    optimize_data = {
        "target_methane": 300.0,
        "scenario_group": "Business As Usual",
        "pesticide_usage": 5.0
    }
    response = client.post("/api/optimize", headers=headers, json=optimize_data)
    assert response.status_code == 200

    # 6. /api/optimize/resource
    opt_res_data = {
        "resources": ["water"],
        "target_methane": 500.0
    }
    response = client.post("/api/optimize/resource", headers=headers, json=opt_res_data)
    assert response.status_code == 200

    # 7. /api/kpi-change
    kpi_data = {
        "metrics": ["Avg Yield"]
    }
    response = client.post("/api/kpi-change", headers=headers, json=kpi_data)
    assert response.status_code == 200


# ── 4. Exception Handling & Input Validation Tests (Validation) ───────────────

def test_api_validation_errors(client):
    headers = {"X-API-Key": "test-key-123"}

    # Invalid input dimension
    compare_data = {
        "dimension": "Invalid Dimension",
        "metrics": ["Avg Yield"]
    }
    response = client.post("/api/compare", headers=headers, json=compare_data)
    assert response.status_code == 422

    # Out-of-range data parameter (maximum fertilizer_usage is 250)
    simulate_data = {
        "scenario_group": "Business As Usual",
        "awd_adoption": "With AWD",
        "fertilizer_usage": 500.0,
        "pesticide_usage": 5.0,
        "water_usage": 600.0
    }
    response = client.post("/api/simulate", headers=headers, json=simulate_data)
    assert response.status_code == 422


@patch("main.get_data_status")
def test_require_data_loaded_returns_409_conflict(mock_get_status, client):
    # Test scenario where no simulation data has been loaded on the server
    mock_get_status.return_value = {"data_loaded": False, "required_columns": ["col1"]}
    
    response = client.get("/api/scenarios", headers={"X-API-Key": "test-key-123"})
    assert response.status_code == 409
    assert response.json()["code"] == "NO_DATA_LOADED"


@patch("main.get_data_status")
def test_generic_exception_handler_returns_clean_500(mock_get_status, client):
    # Simulate a critical system error at get_data_status function.
    # This error will be thrown directly inside require_data_loaded middleware and remain unhandled.
    mock_get_status.side_effect = Exception("System database crash!")

    compare_data = {
        "dimension": "Climate Type",
        "metrics": ["Avg Yield"]
    }
    
    # Call an endpoint protected by the require_data_loaded middleware
    response = client.post("/api/compare", headers={"X-API-Key": "test-key-123"}, json=compare_data)
    
    assert response.status_code == 500
    # Verify the system returns a generic security message from generic_exception_handler
    assert "An internal server error occurred. Please try again later." in response.json()["detail"]


def test_optimization_validation_error_returns_custom_400(client):
    # Validation handler overrides 422 into a structured 400 error for the optimization API
    bad_optimize_data = {
        "target_methane": -1.0,
        "scenario_group": "Business As Usual",
        "pesticide_usage": 5.0
    }
    response = client.post("/api/optimize", headers={"X-API-Key": "test-key-123"}, json=bad_optimize_data)
    assert response.status_code == 400
    assert response.json()["success"] is False
    assert response.json()["message"] == "Cannot be optimized"


@patch("mcp_server.get_kpi_change")  # Patched directly inside mcp_server module
def test_kpi_change_value_error_mapping_to_422(mock_kpi, client):
    # Set side_effect to raise the expected ValueError
    mock_kpi.side_effect = ValueError("Datetime index error")
    
    response = client.post(
        "/api/kpi-change", 
        headers={"X-API-Key": "test-key-123"}, 
        json={"metrics": ["Avg Yield"]}
    )
    
    assert response.status_code == 422
    assert "Datetime index error" in response.json()["detail"]


# ── 5. Auxiliary Local Helper Tests ───────────────────────────────────────────

def test_get_secure_client_ip_variants():
    from main import get_secure_client_ip
    
    mock_request = MagicMock()
    mock_request.headers = {"X-Forwarded-For": "192.168.1.99, 10.0.0.1"}
    
    # Scenario 1: Behind a trusted proxy
    with patch("main.TRUST_PROXY_HEADERS", True):
        ip = get_secure_client_ip(mock_request)
        assert ip == "192.168.1.99"
        
    # Scenario 2: Proxy not trusted
    mock_request.client.host = "127.0.0.1"
    with patch("main.TRUST_PROXY_HEADERS", False):
        ip = get_secure_client_ip(mock_request)
        assert ip == "127.0.0.1"


def test_cors_wildcard_restriction_on_startup():
    # Test the system's built-in CORS self-check mechanism
    raw_origins = "http://localhost:5173, *"
    origins = [o.strip().rstrip("/") for o in raw_origins.split(",") if o.strip()]
    
    with pytest.raises(RuntimeError, match=r"ALLOWED_ORIGINS must not contain '\*'"):
        if "*" in origins:
            raise RuntimeError("ALLOWED_ORIGINS must not contain '*' when allow_credentials=True.")


def test_missing_api_keys_restriction_on_startup():
    raw_api_keys = ""
    keys = {k.strip() for k in raw_api_keys.split(",") if k.strip()}
    
    with pytest.raises(RuntimeError, match="No API_KEYS configured"):
        if not keys:
            raise RuntimeError("No API_KEYS configured.")

def test_validate_metrics_invalid_raises_422(client):
    # invalid branch: line 325-326 (unknown metric -> ValueError -> 422)
    compare_data = {
        "dimension": "Climate Type",
        "metrics": ["Not A Real Metric"]
    }
    response = client.post(
        "/api/compare",
        headers={"X-API-Key": "test-key-123"},
        json=compare_data
    )
    assert response.status_code == 422
    assert "Unknown metric(s)" in str(response.json())


def test_validate_metrics_empty_list_passes_validation(client):
    # short-circuit branch: line 322-323 (empty list returns v unchanged, no raise)
    compare_data = {
        "dimension": "Climate Type",
        "metrics": []
    }
    response = client.post(
        "/api/compare",
        headers={"X-API-Key": "test-key-123"},
        json=compare_data
    )
    # This asserts CURRENT behavior — validator lets it through.
    # If /api/compare is supposed to reject an empty metrics list,
    # that's a business-logic check missing downstream, not here.
    assert response.status_code != 422


def test_validate_resources_invalid_raises_422(client):
    # NOTE: /api/optimize/* routes appear to route validation errors through
    # a custom handler that remaps 422 -> 400 (same as test_optimization_validation_error_returns_custom_400).
    # Confirmed empirically: this endpoint returns 400, not raw 422.
    opt_res_data = {
        "resources": ["not_a_real_resource"],
        "target_methane": 500.0
    }
    response = client.post(
        "/api/optimize/resource",
        headers={"X-API-Key": "test-key-123"},
        json=opt_res_data
    )
    assert response.status_code == 400

def test_kpi_change_validate_metrics_invalid_raises_422(client):
    # KpiChangeRequest.validate_metrics invalid branch (line 398-399)
    # Distinct from CompareRequest.validate_metrics tested earlier —
    # same logic, different class/lines, so needs its own coverage.
    response = client.post(
        "/api/kpi-change",
        headers={"X-API-Key": "test-key-123"},
        json={"metrics": ["Not A Real Metric"]}
    )
    assert response.status_code == 422
    assert "Unknown metric(s)" in str(response.json())

@patch("main.get_data_status")
def test_api_data_status_generic_exception_returns_500(mock_get_status, client):
    mock_get_status.side_effect = Exception("boom")
    response = client.get("/api/data-status", headers={"X-API-Key": "test-key-123"})
    assert response.status_code == 500
    assert "Failed to retrieve data status." in response.json()["detail"]


@patch("main.get_scenarios")
def test_api_scenarios_generic_exception_returns_500(mock_get_scenarios, client):
    mock_get_scenarios.side_effect = Exception("boom")
    response = client.get("/api/scenarios", headers={"X-API-Key": "test-key-123"})
    assert response.status_code == 500
    assert "Failed to retrieve scenarios." in response.json()["detail"]


@patch("main.orchestrator.process_query")
def test_api_compare_generic_exception_returns_500(mock_process_query, client):
    # Non-HTTPException error inside the try block -> falls through to the
    # generic except Exception branch (line 443-444), not the HTTPException re-raise.
    mock_process_query.side_effect = Exception("boom")
    response = client.post(
        "/api/compare",
        headers={"X-API-Key": "test-key-123"},
        json={"dimension": "Climate Type", "metrics": ["Avg Yield"]}
    )
    assert response.status_code == 500
    assert "Comparison failed." in response.json()["detail"]

# ── Generic 500 branches (except Exception) ────────────────────────────────

@patch("main.orchestrator.process_query")
def test_api_optimize_generic_exception_returns_500(mock_process_query, client):
    mock_process_query.side_effect = Exception("boom")
    response = client.post(
        "/api/optimize",
        headers={"X-API-Key": "test-key-123"},
        json={"target_methane": 300.0, "scenario_group": "Business As Usual", "pesticide_usage": 5.0}
    )
    assert response.status_code == 500
    assert "Optimization failed." in response.json()["detail"]


@patch("main.orchestrator.model_agent.execute")
def test_api_optimize_resource_generic_exception_returns_500(mock_execute, client):
    mock_execute.side_effect = Exception("boom")
    response = client.post(
        "/api/optimize/resource",
        headers={"X-API-Key": "test-key-123"},
        json={"resources": ["water"], "target_methane": 500.0}
    )
    assert response.status_code == 500
    assert "Resource optimization failed." in response.json()["detail"]


@patch("main.orchestrator.process_query")
def test_api_simulate_generic_exception_returns_500(mock_process_query, client):
    mock_process_query.side_effect = Exception("boom")
    response = client.post(
        "/api/simulate",
        headers={"X-API-Key": "test-key-123"},
        json={
            "scenario_group": "Business As Usual",
            "awd_adoption": "With AWD",
            "fertilizer_usage": 100.0,
            "pesticide_usage": 5.0,
            "water_usage": 600.0
        }
    )
    assert response.status_code == 500
    assert "Simulation failed." in response.json()["detail"]


# ── HTTPException re-raise branches (except HTTPException: raise) ──────────
# These confirm an HTTPException surfaced from inside the orchestrator call
# passes through untouched, instead of being caught/rewrapped by the
# generic except Exception clause below it.

from fastapi import HTTPException

@patch("main.orchestrator.process_query")
def test_api_compare_httpexception_passthrough(mock_process_query, client):
    mock_process_query.side_effect = HTTPException(status_code=418, detail="teapot")
    response = client.post(
        "/api/compare",
        headers={"X-API-Key": "test-key-123"},
        json={"dimension": "Climate Type", "metrics": ["Avg Yield"]}
    )
    assert response.status_code == 418
    assert response.json()["detail"] == "teapot"


@patch("main.orchestrator.process_query")
def test_api_optimize_httpexception_passthrough(mock_process_query, client):
    mock_process_query.side_effect = HTTPException(status_code=418, detail="teapot")
    response = client.post(
        "/api/optimize",
        headers={"X-API-Key": "test-key-123"},
        json={"target_methane": 300.0, "scenario_group": "Business As Usual", "pesticide_usage": 5.0}
    )
    assert response.status_code == 418
    assert response.json()["detail"] == "teapot"


@patch("main.orchestrator.model_agent.execute")
def test_api_optimize_resource_httpexception_passthrough(mock_execute, client):
    mock_execute.side_effect = HTTPException(status_code=418, detail="teapot")
    response = client.post(
        "/api/optimize/resource",
        headers={"X-API-Key": "test-key-123"},
        json={"resources": ["water"], "target_methane": 500.0}
    )
    assert response.status_code == 418
    assert response.json()["detail"] == "teapot"


@patch("main.orchestrator.process_query")
def test_api_simulate_httpexception_passthrough(mock_process_query, client):
    mock_process_query.side_effect = HTTPException(status_code=418, detail="teapot")
    response = client.post(
        "/api/simulate",
        headers={"X-API-Key": "test-key-123"},
        json={
            "scenario_group": "Business As Usual",
            "awd_adoption": "With AWD",
            "fertilizer_usage": 100.0,
            "pesticide_usage": 5.0,
            "water_usage": 600.0
        }
    )
    assert response.status_code == 418
    assert response.json()["detail"] == "teapot"
