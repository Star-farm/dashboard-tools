"""VPS serving bootstrap. It loads local artifacts but never trains models."""

from app.ml.artifacts import load_bundle
from app.ml.data import load_dataset
from app.ml.model_bundle import ServingState


def load_serving_state(csv_path: str, cache_dir: str) -> ServingState:
    data, fingerprint = load_dataset(csv_path)
    bundle = load_bundle(fingerprint, cache_dir)
    return ServingState(data=data, bundle=bundle, artifact_source="local")
