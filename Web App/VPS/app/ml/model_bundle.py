"""The complete, immutable-at-runtime state required for inference."""

from dataclasses import dataclass
from typing import Any

import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import LabelEncoder

from app.ml.model_config import MODEL_CACHE_VERSION, PREDICTION_TARGETS


@dataclass(frozen=True)
class ModelBundle:
    """Models, encoders, report and identity shipped as one artifact."""

    models: dict[str, RandomForestRegressor]
    label_encoders: dict[str, LabelEncoder]
    model_report: dict[str, Any]
    version: str
    dataset_fingerprint: str

    def validate(self) -> None:
        if self.version != MODEL_CACHE_VERSION:
            raise ValueError(
                f"Artifact version '{self.version}' does not match '{MODEL_CACHE_VERSION}'."
            )
        missing_models = set(PREDICTION_TARGETS) - set(self.models)
        if missing_models:
            raise ValueError(f"Artifact is missing required models: {sorted(missing_models)}")
        missing_encoders = {
            "AWD Adoption", "Scenario Group", "Resource Scenario",
            "Season Type", "Climate Type",
        } - set(self.label_encoders)
        if missing_encoders:
            raise ValueError(f"Artifact is missing required encoders: {sorted(missing_encoders)}")


@dataclass(frozen=True)
class ServingState:
    """Dataset plus its matching pre-trained model bundle."""

    data: pd.DataFrame
    bundle: ModelBundle
    artifact_source: str

