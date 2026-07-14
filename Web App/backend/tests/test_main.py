import pytest
from fastapi.testclient import TestClient

def test_health_check(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}

def test_require_api_key_missing(client):
    # No header provided
    response = client.get("/api/data-status")
    assert response.status_code == 401
    assert "Missing or invalid API key" in response.json()["detail"]

def test_require_api_key_invalid(client):
    # Wrong header key
    response = client.get("/api/data-status", headers={"X-API-Key": "wrong-key"})
    assert response.status_code == 401
    
    # Wrong authorization bearer key
    response = client.get("/api/data-status", headers={"Authorization": "Bearer wrong-key"})
    assert response.status_code == 401

def test_require_api_key_valid(client):
    # Valid header key
    response = client.get("/api/data-status", headers={"X-API-Key": "test-key-123"})
    assert response.status_code == 200
    
    # Valid authorization bearer key
    response = client.get("/api/data-status", headers={"Authorization": "Bearer another-key"})
    assert response.status_code == 200

def test_limit_request_size(client):
    # Create a payload larger than 2MB (or whatever MAX_CONTENT_LENGTH is, default 2MB)
    # We can trigger it by sending a payload larger than MAX_CONTENT_LENGTH, or we can mock/lower the limit.
    # Let's test a very large payload.
    large_payload = "A" * (2 * 1024 * 1024 + 100) # > 2MB
    response = client.post(
        "/api/compare",
        headers={"X-API-Key": "test-key-123"},
        content=large_payload
    )
    assert response.status_code == 413
    assert "Payload too large" in response.json()["detail"]

def test_api_endpoints_success(client):
    headers = {"X-API-Key": "test-key-123"}

    # 1. /api/data-status
    response = client.get("/api/data-status", headers=headers)
    assert response.status_code == 200
    assert response.json()["data_loaded"] is True

    # 2. /api/scenarios
    response = client.get("/api/scenarios", headers=headers)
    assert response.status_code == 200
    assert "scenario_groups" in response.json()

    # 3. /api/compare
    compare_data = {
        "dimension": "Climate Type",
        "metrics": ["Avg Yield"],
        "filters": {"AWD Adoption": "With AWD"}
    }
    response = client.post("/api/compare", headers=headers, json=compare_data)
    assert response.status_code == 200
    assert "result" in response.json()
    assert "compare_dimension" in response.json()["result"]

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
    assert "predictions" in response.json()

    # 5. /api/optimize
    optimize_data = {
        "target_methane": 300.0,
        "scenario_group": "Business As Usual",
        "pesticide_usage": 5.0
    }
    response = client.post("/api/optimize", headers=headers, json=optimize_data)
    assert response.status_code == 200
    assert "optimized_inputs" in response.json()

    # 6. /api/optimize/resource
    opt_res_data = {
        "resources": ["water", "fertilizer"],
        "fixed_inputs": {"awd_adoption": "With AWD"},
        "target_methane": 500.0
    }
    response = client.post("/api/optimize/resource", headers=headers, json=opt_res_data)
    assert response.status_code == 200
    assert "optimized_inputs" in response.json()

    # 7. /api/kpi-change
    kpi_data = {
        "metrics": ["Avg Yield", "Methane Emissions"]
    }
    response = client.post("/api/kpi-change", headers=headers, json=kpi_data)
    assert response.status_code == 200
    assert "kpis" in response.json()

def test_api_validation_errors(client):
    headers = {"X-API-Key": "test-key-123"}

    # Invalid dimension in compare
    compare_data = {
        "dimension": "Invalid Dimension",
        "metrics": ["Avg Yield"]
    }
    response = client.post("/api/compare", headers=headers, json=compare_data)
    assert response.status_code == 422

    # Invalid metric in compare
    compare_data = {
        "dimension": "Climate Type",
        "metrics": ["Invalid Metric"]
    }
    response = client.post("/api/compare", headers=headers, json=compare_data)
    assert response.status_code == 422

    # Validation out of range for simulation
    simulate_data = {
        "scenario_group": "Business As Usual",
        "awd_adoption": "With AWD",
        "fertilizer_usage": 500.0, # Range is 50 to 250
        "pesticide_usage": 5.0,
        "water_usage": 600.0
    }
    response = client.post("/api/simulate", headers=headers, json=simulate_data)
    assert response.status_code == 422
