import os
import sys
from unittest.mock import patch

backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

os.environ["API_KEYS"] = "test-key-123,another-key"
os.environ["DEFAULT_CSV_PATH"] = os.path.join(backend_dir, "data", "Simulation_Data.csv")
os.environ["MODEL_CACHE_DIR"] = os.path.join(backend_dir, ".pytest_model_cache")
os.environ["TRUST_PROXY_HEADERS"] = "true"
os.environ["ENABLE_DOCS"] = "false" 

from app.ml.artifacts import artifact_path, save_bundle  # noqa: E402
from app.ml.data import load_dataset  # noqa: E402
from app.ml.training import train_model_bundle  # noqa: E402

_test_data, _test_fingerprint = load_dataset(os.environ["DEFAULT_CSV_PATH"])
if not artifact_path(os.environ["MODEL_CACHE_DIR"], _test_fingerprint).exists():
    save_bundle(
        train_model_bundle(_test_data, _test_fingerprint),
        os.environ["MODEL_CACHE_DIR"],
    )

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402



@pytest.fixture(scope="session", autouse=True)
def setup_test_env():
    cache_dir = os.environ["MODEL_CACHE_DIR"]
    os.makedirs(cache_dir, exist_ok=True)
    yield
    if os.path.exists(cache_dir):
        import shutil
        try:
            shutil.rmtree(cache_dir)
        except Exception:
            pass


@pytest.fixture
def client():
    import main
    with patch("main.API_KEYS", {"test-key-123", "another-key"}):
        with TestClient(main.app, raise_server_exceptions=False) as c:
            yield c
