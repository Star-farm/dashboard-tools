import os
import sys

# Ensure backend directory is in path
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

# Set test environment variables BEFORE importing backend modules
os.environ["API_KEYS"] = "test-key-123,another-key"
os.environ["DEFAULT_CSV_PATH"] = os.path.join(backend_dir, "data", "Simulation_Data.csv")
os.environ["MODEL_CACHE_DIR"] = os.path.join(backend_dir, ".pytest_model_cache")
os.environ["GCS_CACHE_BUCKET"] = ""  # Disable GCS in tests
os.environ["TRUST_PROXY_HEADERS"] = "true"

import pytest
from fastapi.testclient import TestClient

@pytest.fixture(scope="session", autouse=True)
def setup_test_env():
    cache_dir = os.environ["MODEL_CACHE_DIR"]
    os.makedirs(cache_dir, exist_ok=True)
    yield
    # Clean up test cache file if needed
    if os.path.exists(cache_dir):
        import shutil
        try:
            shutil.rmtree(cache_dir)
        except Exception:
            pass

@pytest.fixture
def client():
    from main import app
    return TestClient(app)
