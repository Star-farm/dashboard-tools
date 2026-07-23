import tempfile
from pathlib import Path

import pytest

from app.ml.artifacts import artifact_path, load_bundle, save_bundle
from app.ml.data import load_dataset
from app.ml.model_bundle import ModelBundle


def test_bundle_round_trip_uses_one_packaged_state():
    data, fingerprint = load_dataset("data/Simulation_Data.csv")
    from app.ml.training import train_model_bundle
    bundle = train_model_bundle(data, fingerprint)
    with tempfile.TemporaryDirectory() as cache_dir:
        save_bundle(bundle, cache_dir)
        loaded = load_bundle(fingerprint, cache_dir)
    assert isinstance(loaded, ModelBundle)
    assert loaded.dataset_fingerprint == fingerprint
    assert set(loaded.models) == {"Avg Yield", "Methane Emissions", "Revenue", "Production Cost"}


def test_serving_fails_when_artifact_is_missing():
    with tempfile.TemporaryDirectory() as cache_dir:
        with pytest.raises(RuntimeError, match="Run 'python -m app.ml.train'"):
            load_bundle("missing", cache_dir)


def test_serving_fails_when_artifact_is_corrupt():
    with tempfile.TemporaryDirectory() as cache_dir:
        path = artifact_path(cache_dir, "broken")
        Path(path).write_text("not a joblib artifact", encoding="utf-8")
        with pytest.raises(RuntimeError, match="is invalid"):
            load_bundle("broken", cache_dir)
