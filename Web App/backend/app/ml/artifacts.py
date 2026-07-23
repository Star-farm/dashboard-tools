"""Backend artifact persistence: local filesystem with optional GCS mirroring."""

import logging
import os
import tempfile
from pathlib import Path

import joblib

from app.ml.model_bundle import ModelBundle
from app.ml.model_config import MODEL_CACHE_VERSION

logger = logging.getLogger(__name__)


def artifact_name(fingerprint: str) -> str:
    return f"{MODEL_CACHE_VERSION}_{fingerprint}.joblib"


def artifact_path(cache_dir: str, fingerprint: str) -> Path:
    return Path(cache_dir) / artifact_name(fingerprint)


def gcs_blob_name(fingerprint: str) -> str:
    return f"model-cache/{artifact_name(fingerprint)}"


def _temporary_path(destination: Path, suffix: str) -> Path:
    destination.parent.mkdir(parents=True, exist_ok=True)
    handle = tempfile.NamedTemporaryFile(
        dir=destination.parent, prefix=f".{destination.name}.", suffix=suffix,
        delete=False,
    )
    handle.close()
    return Path(handle.name)


def save_bundle(bundle: ModelBundle, cache_dir: str, gcs_bucket: str = "") -> Path:
    bundle.validate()
    destination = artifact_path(cache_dir, bundle.dataset_fingerprint)
    temporary = _temporary_path(destination, ".tmp")
    try:
        joblib.dump(bundle, temporary, compress=3)
        os.replace(temporary, destination)
    finally:
        temporary.unlink(missing_ok=True)
    if gcs_bucket:
        from google.cloud import storage
        blob = storage.Client().bucket(gcs_bucket).blob(
            gcs_blob_name(bundle.dataset_fingerprint)
        )
        blob.upload_from_filename(str(destination))
    return destination


def _download_from_gcs(fingerprint: str, destination: Path, bucket_name: str) -> bool:
    if not bucket_name:
        return False
    try:
        from google.cloud import storage
        blob = storage.Client().bucket(bucket_name).blob(gcs_blob_name(fingerprint))
        if not blob.exists():
            return False
        temporary = _temporary_path(destination, ".download")
        try:
            blob.download_to_filename(str(temporary))
            os.replace(temporary, destination)
        finally:
            temporary.unlink(missing_ok=True)
        return True
    except Exception:
        logger.exception("Failed to download model artifact from GCS")
        return False


def load_bundle(
    fingerprint: str, cache_dir: str, gcs_bucket: str = "",
) -> tuple[ModelBundle, str]:
    destination = artifact_path(cache_dir, fingerprint)
    source = "local"
    if not destination.exists():
        if not _download_from_gcs(fingerprint, destination, gcs_bucket):
            remote = (
                f" or gs://{gcs_bucket}/{gcs_blob_name(fingerprint)}"
                if gcs_bucket else ""
            )
            raise RuntimeError(
                f"Model artifact not found at '{destination}'{remote}. "
                "Run 'python -m app.ml.train' before starting serving."
            )
        source = "gcs"
    try:
        bundle = joblib.load(destination)
        if not isinstance(bundle, ModelBundle):
            raise TypeError("Artifact does not contain a ModelBundle.")
        bundle.validate()
        if bundle.dataset_fingerprint != fingerprint:
            raise ValueError("Artifact dataset fingerprint does not match the CSV.")
        return bundle, source
    except Exception as exc:
        raise RuntimeError(
            f"Model artifact '{destination}' is invalid: {exc}. "
            "Run 'python -m app.ml.train' to replace it."
        ) from exc
