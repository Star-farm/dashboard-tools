"""Manual Backend training entrypoint: python -m app.ml.train."""

import os
import tempfile
from pathlib import Path

import app.config  # noqa: F401
from app.ml.artifacts import save_bundle
from app.ml.data import load_dataset
from app.ml.training import train_model_bundle


def main() -> None:
    csv_path = os.getenv("DEFAULT_CSV_PATH", "data/Simulation_Data.csv")
    cache_dir = os.getenv(
        "MODEL_CACHE_DIR", str(Path(tempfile.gettempdir()) / "model_cache"),
    )
    gcs_bucket = os.getenv("GCS_CACHE_BUCKET", "")
    data, fingerprint = load_dataset(csv_path)
    bundle = train_model_bundle(data, fingerprint)
    destination = save_bundle(bundle, cache_dir, gcs_bucket)
    print(f"Model artifact created: {destination}")
    if gcs_bucket:
        print(f"Model artifact uploaded to GCS bucket: {gcs_bucket}")


if __name__ == "__main__":
    main()
