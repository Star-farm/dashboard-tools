"""Dataset validation and normalization shared by training and serving."""

import hashlib
import os
import pandas as pd

from app.ml.model_config import (
    CATEGORICAL_COLS, MIN_ROWS_PER_TARGET, REQUIRED_COLUMNS,
)


def dataset_fingerprint(csv_path: str) -> str:
    hasher = hashlib.md5()
    with open(csv_path, "rb") as handle:
        for chunk in iter(lambda: handle.read(8192), b""):
            hasher.update(chunk)
    return hasher.hexdigest()[:12]


def validate_csv_schema(df: pd.DataFrame) -> tuple[bool, list[str]]:
    errors: list[str] = []
    missing = [column for column in REQUIRED_COLUMNS if column not in df.columns]
    if missing:
        errors.append(f"Missing {len(missing)} required columns: {missing}")

    numeric_cols = [
        column for column in REQUIRED_COLUMNS
        if column not in CATEGORICAL_COLS and column != "datetime"
    ]
    for column in numeric_cols:
        if column not in df.columns:
            continue
        coerced = pd.to_numeric(df[column], errors="coerce")
        bad_mask = coerced.isna() & df[column].notna()
        if bad_mask.any():
            errors.append(
                f"Column '{column}' contains {int(bad_mask.sum())} non-numeric values."
            )

    for column in CATEGORICAL_COLS:
        if column in df.columns and df[column].dropna().astype(str).str.strip().eq("").all():
            errors.append(f"Column '{column}' does not contain any valid entries.")

    if "datetime" in df.columns:
        invalid_dates = pd.to_datetime(df["datetime"], errors="coerce").isna()
        if invalid_dates.any():
            errors.append(
                f"Column 'datetime' contains {int(invalid_dates.sum())} invalid date values."
            )

    if "AWD Adoption" in df.columns:
        values = set(df["AWD Adoption"].dropna().astype(str).str.strip().unique())
        allowed = {"With AWD", "Without AWD"}
        unexpected = values - allowed
        if unexpected and values:
            errors.append(
                f"Column 'AWD Adoption' contains invalid entries {unexpected}. Allowed: {allowed}"
            )

    if len(df) < MIN_ROWS_PER_TARGET:
        errors.append(
            f"The dataset must contain at least {MIN_ROWS_PER_TARGET} rows. Found: {len(df)}"
        )
    return not errors, errors


def load_dataset(csv_path: str) -> tuple[pd.DataFrame, str]:
    if not csv_path or not os.path.exists(csv_path):
        raise FileNotFoundError(f"Simulation file path not found: {csv_path}")
    df = pd.read_csv(csv_path)
    valid, errors = validate_csv_schema(df)
    if not valid:
        raise ValueError("Dataset schema is invalid: " + "; ".join(errors))

    df = df.copy()
    df["Revenue"] = (
        pd.to_numeric(df["Net Income"], errors="coerce")
        + pd.to_numeric(df["Production Cost"], errors="coerce")
    )
    df["datetime"] = pd.to_datetime(df["datetime"], errors="coerce")
    df["Year"] = df["datetime"].dt.year
    for column in CATEGORICAL_COLS:
        if column in df.columns:
            df[column] = df[column].astype(str).str.strip()
    return df, dataset_fingerprint(csv_path)
