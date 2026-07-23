"""VPS artifact persistence on its mounted local model-cache volume."""

import os
import tempfile
from pathlib import Path

import joblib

from app.ml.model_bundle import ModelBundle
from app.ml.model_config import MODEL_CACHE_VERSION


def artifact_name(fingerprint: str) -> str:
    return f"{MODEL_CACHE_VERSION}_{fingerprint}.joblib"


def artifact_path(cache_dir: str, fingerprint: str) -> Path:
    return Path(cache_dir) / artifact_name(fingerprint)


def save_bundle(bundle: ModelBundle, cache_dir: str) -> Path:
    bundle.validate()
    destination = artifact_path(cache_dir, bundle.dataset_fingerprint)
    destination.parent.mkdir(parents=True, exist_ok=True)
    handle = tempfile.NamedTemporaryFile(
        dir=destination.parent, prefix=f".{destination.name}.", suffix=".tmp",
        delete=False,
    )
    handle.close()
    temporary = Path(handle.name)
    try:
        joblib.dump(bundle, temporary, compress=3)
        os.replace(temporary, destination)
    finally:
        temporary.unlink(missing_ok=True)
    return destination


def load_bundle(fingerprint: str, cache_dir: str) -> ModelBundle:
    path = artifact_path(cache_dir, fingerprint)
    if not path.exists():
        raise RuntimeError(
            f"Model artifact not found at '{path}'. "
            "Run 'python -m app.ml.train' before starting serving."
        )
    try:
        bundle = joblib.load(path)
        if not isinstance(bundle, ModelBundle):
            raise TypeError("Artifact does not contain a ModelBundle.")
        bundle.validate()
        if bundle.dataset_fingerprint != fingerprint:
            raise ValueError("Artifact dataset fingerprint does not match the CSV.")
        return bundle
    except Exception as exc:
        raise RuntimeError(
            f"Model artifact '{path}' is invalid: {exc}. "
            "Run 'python -m app.ml.train' to replace it."
        ) from exc
