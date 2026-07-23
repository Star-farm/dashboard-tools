"""Offline model training. This module is never imported by serving code."""

from typing import Any

import numpy as np
import pandas as pd
from sklearn.base import clone
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import GroupShuffleSplit
from sklearn.preprocessing import LabelEncoder

from app.ml.evaluation import build_groups, evaluate, gate_passed, metadata, profile_target
from app.ml.model_bundle import ModelBundle
from app.ml.model_config import (
    AVERAGED_DIMENSIONS, MIN_ROWS_PER_TARGET, MODEL_CACHE_VERSION,
    PREDICTION_TARGETS,
)


def _evaluate_derived_financials(
    df: pd.DataFrame,
    features: pd.DataFrame,
    models: dict[str, RandomForestRegressor],
) -> dict[str, Any]:
    groups = build_groups(df)
    if groups.nunique() < 2:
        return {}
    train, test = next(GroupShuffleSplit(
        n_splits=1, test_size=0.2, random_state=42,
    ).split(features, groups=groups))
    revenue = clone(models["Revenue"]).fit(
        features.iloc[train], df["Revenue"].iloc[train]
    ).predict(features.iloc[test])
    cost = clone(models["Production Cost"]).fit(
        features.iloc[train], df["Production Cost"].iloc[train]
    ).predict(features.iloc[test])
    net_income = revenue - cost
    predicted = {
        "Net Income": net_income,
        "Profit Margin": net_income / np.maximum(1.0, revenue) * 100.0,
    }
    report: dict[str, Any] = {}
    holdout = df.iloc[test]
    for metric, values in predicted.items():
        actual = holdout[metric].to_numpy(dtype=float)
        absolute_errors = np.abs(actual - values)
        report[metric] = {
            "metrics": {
                "r2": float(r2_score(actual, values)),
                "mae": float(mean_absolute_error(actual, values)),
                "rmse": float(mean_squared_error(actual, values) ** 0.5),
                "bias": float(np.mean(values - actual)),
                "prediction_interval": {
                    "level": 0.90,
                    "absolute_error": float(np.quantile(
                        absolute_errors, 0.90, method="higher",
                    )),
                },
            },
            "profile": profile_target(holdout[metric]),
        }
    return report


def train_model_bundle(df: pd.DataFrame, fingerprint: str) -> ModelBundle:
    """Fit and evaluate every production target, returning one complete bundle."""
    encoders: dict[str, LabelEncoder] = {}
    for source, encoded in (
        ("AWD Adoption", "AWD_encoded"),
        ("Scenario Group", "ScenarioGroup_encoded"),
        *((dimension, f"{dimension}_encoded") for dimension in AVERAGED_DIMENSIONS),
    ):
        encoder = LabelEncoder()
        df[encoded] = encoder.fit_transform(df[source])
        encoders[source] = encoder
    features = df[[
        "AWD_encoded", "ScenarioGroup_encoded", "Year",
        *[f"{dimension}_encoded" for dimension in AVERAGED_DIMENSIONS],
        "Fertilizer Usage", "Pesticide Usage", "Water Usage",
    ]]
    models: dict[str, RandomForestRegressor] = {}
    report = metadata(MODEL_CACHE_VERSION, fingerprint, len(df))
    report.update(targets={}, quality_gate_passed=True)
    groups = build_groups(df)
    for target in PREDICTION_TARGETS:
        mask = df[target].notna()
        target_values = df.loc[mask, target]
        if len(target_values) < MIN_ROWS_PER_TARGET:
            raise ValueError(
                f"Target '{target}' has fewer than {MIN_ROWS_PER_TARGET} valid rows."
            )
        model = RandomForestRegressor(n_estimators=100, random_state=42, n_jobs=-1)
        try:
            metrics, importance = evaluate(
                model, features.loc[mask], target_values, groups.loc[mask],
            )
            passed = gate_passed(target, metrics)
            report["targets"][target] = {
                "metrics": metrics,
                "profile": profile_target(target_values),
                "quality_gate_passed": passed,
                "feature_importance": importance,
            }
            report["quality_gate_passed"] &= passed
        except Exception as exc:
            report["targets"][target] = {
                "evaluation_error": str(exc),
                "profile": profile_target(target_values),
                "quality_gate_passed": False,
            }
            report["quality_gate_passed"] = False
        model.fit(features.loc[mask], target_values)
        models[target] = model

    report["derived_targets"] = _evaluate_derived_financials(df, features, models)
    bundle = ModelBundle(models, encoders, report, MODEL_CACHE_VERSION, fingerprint)
    bundle.validate()
    return bundle
