"""Manual VPS training entrypoint: python -m app.ml.train."""

import os

import app.config  # noqa: F401
from app.ml.artifacts import save_bundle
from app.ml.data import load_dataset
from app.ml.training import train_model_bundle


def main() -> None:
    csv_path = os.getenv("DEFAULT_CSV_PATH", "/app/data/Simulation_Data.csv")
    cache_dir = os.getenv("MODEL_CACHE_DIR", "/app/model_cache")
    data, fingerprint = load_dataset(csv_path)
    bundle = train_model_bundle(data, fingerprint)
    destination = save_bundle(bundle, cache_dir)
    print(f"Model artifact created: {destination}")


if __name__ == "__main__":
    main()
