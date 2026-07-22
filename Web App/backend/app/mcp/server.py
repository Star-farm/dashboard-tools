"""MCP tools, simulation data access, and hybrid model implementation."""

import os
import hashlib
import logging
import tempfile
from pathlib import Path

import joblib
from typing import Any
import numpy as np
import pandas as pd
from mcp.server.fastmcp import FastMCP
from sklearn.ensemble import RandomForestRegressor
from sklearn.base import clone
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import GroupShuffleSplit
from sklearn.preprocessing import LabelEncoder
from app.ml.evaluation import build_groups, evaluate, gate_passed, metadata, profile_target
import app.logging_config  # noqa: F401 - configures structured logging


# ── FastMCP Server Initialization ─────────────────────────────────────────────
mcp = FastMCP("AI Agents Agricultural Modeling")
DEFAULT_CSV_PATH = os.getenv("DEFAULT_CSV_PATH", "data/Simulation_Data.csv")
MODEL_CACHE_DIR = os.getenv(
    "MODEL_CACHE_DIR", str(Path(tempfile.gettempdir()) / "model_cache")
)
GCS_CACHE_BUCKET = os.getenv("GCS_CACHE_BUCKET", "")  # Empty string disables GCS cache, using local-only mode
MODEL_CACHE_VERSION = "v12_production_cost_model_p90_2050"
DEFAULT_SIMULATION_YEAR = 2050
AVERAGED_DIMENSIONS = ["Resource Scenario", "Season Type", "Climate Type"]
SIMULATION_INPUT_LIMITS = {
    "Fertilizer Usage": (80.0, 145.0),
    "Pesticide Usage": (4.0, 7.5),
    "Water Usage": (0.0, 850.0),
}
logger = logging.getLogger(__name__)

# Empirical calibration factors from the simulation CSV, not original GAMA constants.
COST_FACTOR_BAU = 1.1599
COST_FACTOR_OMRH = 1.1044

# ── Global State Storage ──────────────────────────────────────────────────────
data: pd.DataFrame | None = None
models: dict[str, RandomForestRegressor] = {}
label_encoders: dict[str, LabelEncoder] = {}
model_report: dict[str, Any] = {}

# ── Feature & Label Schemas ───────────────────────────────────────────────────
INPUT_FEATURES = [
    "AWD Adoption",
    "Scenario Group",
    "Year",
    "Resource Scenario",
    "Season Type",
    "Climate Type",
    "Fertilizer Usage",
    "Pesticide Usage",
    "Water Usage",
]

PREDICTION_TARGETS = [
    "Avg Yield",
    "Methane Emissions",
    "Revenue",
    "Production Cost",
]

AGG_NUMERIC_COLS = [
    "Avg Yield",
    "Methane Emissions",
    "Emission Intensity",
    "Profit Margin",
    "Net Income",
    "Production Cost",
    "Straw Value",
    "Water Usage",
    "Fertilizer Usage",
    "Pesticide Usage",
    "Salinity Exposure",
    "Max Flood Continuous",
    "Flood Stress",
    "Drought Stress",
    "Salinity Stress",
    "Biodiversity",
    "Resilient Varieties",
    "Water Reliability",
    "Labor Intensity",
]

CATEGORICAL_COLS = [
    "AWD Adoption",
    "Scenario Group",
    "Season Type",
    "Climate Type",
    "Resource Scenario",
    "Scenario Name",
]

REQUIRED_COLUMNS = sorted(set(
    CATEGORICAL_COLS
    + [feature for feature in INPUT_FEATURES if feature != "Year"]
    + ["datetime"]
    + [target for target in PREDICTION_TARGETS if target != "Revenue"]
    + AGG_NUMERIC_COLS
))

MIN_ROWS_PER_TARGET = 10


# ── Shared Private Helpers ────────────────────────────────────────────────────

def _dataset_fingerprint(csv_path: str) -> str:
    """Generate a unique fingerprint based on actual file content to avoid cache invalidation during redeployments."""
    hasher = hashlib.md5()
    with open(csv_path, "rb") as f:
        # Read in chunks to avoid loading large files entirely into RAM
        for chunk in iter(lambda: f.read(8192), b""):
            hasher.update(chunk)
    return hasher.hexdigest()[:12]


def _gcs_blob_name(cache_key: str) -> str:
    return f"model-cache/{MODEL_CACHE_VERSION}_{cache_key}.joblib"


def _temporary_cache_path(destination: Path, suffix: str) -> Path:
    """Reserve a unique temporary file beside its destination for atomic replace."""

    handle = tempfile.NamedTemporaryFile(
        dir=destination.parent,
        prefix=f".{destination.name}.",
        suffix=suffix,
        delete=False,
    )
    handle.close()
    return Path(handle.name)


def _try_download_cache_from_gcs(cache_key: str, local_path: str) -> bool:
    """Attempt to download the model cache from GCS to local storage. Returns True if successful."""
    if not GCS_CACHE_BUCKET:
        return False
    try:
        from google.cloud import storage
        client = storage.Client()
        bucket = client.bucket(GCS_CACHE_BUCKET)
        blob = bucket.blob(_gcs_blob_name(cache_key))
        if blob.exists():
            destination = Path(local_path)
            destination.parent.mkdir(parents=True, exist_ok=True)
            temporary = _temporary_cache_path(destination, ".download")
            try:
                blob.download_to_filename(str(temporary))
                os.replace(temporary, destination)
            finally:
                temporary.unlink(missing_ok=True)
            uri = f"gs://{GCS_CACHE_BUCKET}/{_gcs_blob_name(cache_key)}"
            logger.info(
                "Downloaded model cache from GCS",
                extra={"event": "cache_downloaded", "gcs_uri": uri},
            )
            return True
    except Exception:
        logger.warning(
            "GCS cache download failed; continuing without remote cache",
            extra={"event": "cache_download_failed"},
            exc_info=True,
        )
    return False


def _try_upload_cache_to_gcs(cache_key: str, local_path: str) -> None:
    """Upload the newly trained model cache to GCS for future cold starts. Failures are non-fatal."""
    if not GCS_CACHE_BUCKET:
        return
    try:
        from google.cloud import storage
        client = storage.Client()
        bucket = client.bucket(GCS_CACHE_BUCKET)
        blob = bucket.blob(_gcs_blob_name(cache_key))
        blob.upload_from_filename(local_path)
        uri = f"gs://{GCS_CACHE_BUCKET}/{_gcs_blob_name(cache_key)}"
        logger.info(
            "Uploaded model cache to GCS",
            extra={"event": "cache_uploaded", "gcs_uri": uri},
        )
    except Exception:
        logger.warning(
            "GCS cache upload failed; local cache remains available",
            extra={"event": "cache_upload_failed"},
            exc_info=True,
        )


def _agg_key(col: str) -> str:
    normalized = col.lower().replace(" ", "_")
    if normalized.startswith("avg_"):
        return normalized
    return f"avg_{normalized}"


def _finite_float(value: Any, default: float = 0.0) -> float:
    try:
        result = float(value)
    except (TypeError, ValueError):
        return float(default)
    return result if np.isfinite(result) else float(default)


def _calculate_financial_metrics(
    *,
    scenario_group: str,
    fertilizer_usage: float,
    pesticide_usage: float,
    water_usage: float,
    labor_intensity: float,
    revenue: float,
) -> dict[str, float]:
    fertilizer = max(0.0, _finite_float(fertilizer_usage))
    pesticide = max(0.0, _finite_float(pesticide_usage))
    water = max(0.0, _finite_float(water_usage))
    labor = max(0.0, _finite_float(labor_intensity))
    safe_revenue = _finite_float(revenue)

    scenario = str(scenario_group).strip().lower()
    is_omrh = "one million" in scenario or "omrh" in scenario
    mechanization_cost = 150.0 + 15.0 * pesticide if is_omrh else 30.0
    base_cost = (
        labor * 2.0
        + fertilizer * 0.8
        + pesticide * 8.0
        + water * 0.3
        + mechanization_cost
    )
    production_cost = base_cost * (COST_FACTOR_OMRH if is_omrh else COST_FACTOR_BAU)
    net_income = safe_revenue - production_cost
    profit_margin = net_income / max(1.0, safe_revenue) * 100.0

    return {
        "Production Cost": float(production_cost),
        "Net Income": float(net_income),
        "Profit Margin": float(profit_margin),
    }


def _evaluate_derived_financials(
    df: pd.DataFrame,
    X: pd.DataFrame,
    fitted_models: dict[str, RandomForestRegressor],
) -> dict[str, Any]:
    """Evaluate formula-derived financial metrics on a group-aware holdout."""
    groups = build_groups(df)
    if groups.nunique() < 2:
        return {}
    train, test = next(
        GroupShuffleSplit(n_splits=1, test_size=0.2, random_state=42).split(X, groups=groups)
    )
    revenue_predictions = clone(fitted_models["Revenue"]).fit(
        X.iloc[train], df["Revenue"].iloc[train]
    ).predict(X.iloc[test])
    cost_predictions = clone(fitted_models["Production Cost"]).fit(
        X.iloc[train], df["Production Cost"].iloc[train]
    ).predict(X.iloc[test])

    predicted = {"Net Income": [], "Profit Margin": []}
    holdout = df.iloc[test]
    for revenue, production_cost in zip(revenue_predictions, cost_predictions):
        net_income = float(revenue - production_cost)
        predicted["Net Income"].append(net_income)
        predicted["Profit Margin"].append(net_income / max(1.0, float(revenue)) * 100.0)

    report = {}
    for metric, values in predicted.items():
        actual = holdout[metric].to_numpy(dtype=float)
        values_array = np.asarray(values, dtype=float)
        absolute_errors = np.abs(actual - values_array)
        report[metric] = {
            "metrics": {
                "r2": float(r2_score(actual, values_array)),
                "mae": float(mean_absolute_error(actual, values_array)),
                "rmse": float(mean_squared_error(actual, values_array) ** 0.5),
                "bias": float(np.mean(values_array - actual)),
                "prediction_interval": {
                    "level": 0.90,
                    "absolute_error": float(np.quantile(absolute_errors, 0.90, method="higher")),
                },
            },
            "profile": profile_target(holdout[metric]),
        }
    return report


def _load_and_train(df: pd.DataFrame, cache_key: str | None = None) -> dict[str, Any]:
    global data, models, label_encoders, model_report

    df = df.copy()

    if "Net Income" in df.columns and "Production Cost" in df.columns:
        df["Revenue"] = (
            pd.to_numeric(df["Net Income"], errors="coerce")
            + pd.to_numeric(df["Production Cost"], errors="coerce")
        )

    if "datetime" in df.columns:
        df["datetime"] = pd.to_datetime(df["datetime"], errors="coerce")
        df["Year"] = df["datetime"].dt.year

    if "Year" not in df.columns or df["Year"].isna().any():
        return {
            "status": "error",
            "message": "The datetime column must contain a valid date for every simulation row.",
        }

    for col in CATEGORICAL_COLS:
        if col in df.columns:
            df[col] = df[col].astype(str).str.strip()

    cache_path = (
        os.path.join(MODEL_CACHE_DIR, f"{MODEL_CACHE_VERSION}_{cache_key}.joblib")
        if cache_key else None
    )

    # ── Level 1: Local cache (within current container lifecycle) ───────────
    if cache_path and os.path.exists(cache_path):
        try:
            cached = joblib.load(cache_path)
            required_models = set(PREDICTION_TARGETS)
            if set(cached.get("models", {})) != required_models:
                raise ValueError("cache is missing required hybrid models")
            data = df
            models = cached["models"]
            label_encoders = cached["label_encoders"]
            model_report = cached.get("model_report", {})
            logger.info(
                "Loaded models from cache",
                extra={"event": "cache_loaded", "cache_source": "local", "cache_path": cache_path},
            )
            return {
                "status": "success", "rows_loaded": len(df),
                "trained_models": list(models.keys()), "skipped_models": [],
                "from_cache": "local",
            }
        except Exception:
            logger.warning(
                "Local model cache is invalid; trying remote cache or training",
                extra={"event": "cache_load_failed", "cache_source": "local", "cache_path": cache_path},
                exc_info=True,
            )

    # ── Level 2: GCS cache (persists across container cold starts) ──────────
    if cache_path and cache_key and _try_download_cache_from_gcs(cache_key, cache_path):
        try:
            cached = joblib.load(cache_path)
            required_models = set(PREDICTION_TARGETS)
            if set(cached.get("models", {})) != required_models:
                raise ValueError("cache is missing required hybrid models")
            data = df
            models = cached["models"]
            label_encoders = cached["label_encoders"]
            model_report = cached.get("model_report", {})
            logger.info(
                "Loaded models from cache",
                extra={"event": "cache_loaded", "cache_source": "gcs", "cache_path": cache_path},
            )
            return {
                "status": "success", "rows_loaded": len(df),
                "trained_models": list(models.keys()), "skipped_models": [],
                "from_cache": "gcs",
            }
        except Exception:
            logger.warning(
                "Downloaded model cache is invalid; retraining",
                extra={"event": "cache_load_failed", "cache_source": "gcs", "cache_path": cache_path},
                exc_info=True,
            )

    # ── No valid cache found -> train regression models ────────────────────
    new_label_encoders = {}

    le_awd = LabelEncoder()
    df["AWD_encoded"] = le_awd.fit_transform(df["AWD Adoption"])
    new_label_encoders["AWD Adoption"] = le_awd

    le_scenario = LabelEncoder()
    df["ScenarioGroup_encoded"] = le_scenario.fit_transform(df["Scenario Group"])
    new_label_encoders["Scenario Group"] = le_scenario

    encoded_dimension_columns = []
    for dimension in AVERAGED_DIMENSIONS:
        encoder = LabelEncoder()
        encoded_col = f"{dimension}_encoded"
        df[encoded_col] = encoder.fit_transform(df[dimension])
        new_label_encoders[dimension] = encoder
        encoded_dimension_columns.append(encoded_col)

    X_all = df[[
        "AWD_encoded",
        "ScenarioGroup_encoded",
        "Year",
        *encoded_dimension_columns,
        "Fertilizer Usage",
        "Pesticide Usage",
        "Water Usage",
    ]]

    new_models = {}
    model_report = metadata(MODEL_CACHE_VERSION, cache_key, len(df))
    model_report.update(targets={}, quality_gate_passed=True)
    trained, skipped = [], []
    for target in PREDICTION_TARGETS:
        if target not in df.columns:
            skipped.append(target)
            continue

        mask = df[target].notna()
        X_train = X_all[mask]
        y_train = df.loc[mask, target]

        if len(y_train) < MIN_ROWS_PER_TARGET:
            skipped.append(target)
            continue

        model = RandomForestRegressor(n_estimators=100, random_state=42, n_jobs=-1)
        try:
            metrics, importance = evaluate(model, X_train, y_train, build_groups(df).loc[mask])
            passed = gate_passed(target, metrics)
            model_report["targets"][target] = {"metrics": metrics, "profile": profile_target(y_train), "quality_gate_passed": passed, "feature_importance": importance}
            model_report["quality_gate_passed"] = model_report["quality_gate_passed"] and passed
        except Exception as exc:
            model_report["targets"][target] = {"evaluation_error": str(exc), "profile": profile_target(y_train), "quality_gate_passed": False}
            model_report["quality_gate_passed"] = False
        model.fit(X_train, y_train)
        new_models[target] = model
        trained.append(target)

    if not new_models:
        return {
            "status": "error",
            "message": "Failed to train any regression models due to insufficient row data per target column.",
            "skipped": skipped,
        }

    if {"Revenue", "Production Cost"}.issubset(new_models):
        model_report["derived_targets"] = _evaluate_derived_financials(df, X_all, new_models)

    data = df
    models = new_models
    label_encoders = new_label_encoders

    # ── Save cache: locally first, then upload to GCS ──────────────────────
    if cache_path and cache_key:
        try:
            destination = Path(cache_path)
            destination.parent.mkdir(parents=True, exist_ok=True)
            temporary = _temporary_cache_path(destination, ".tmp")
            try:
                joblib.dump(
                    {"models": new_models, "label_encoders": new_label_encoders, "model_report": model_report},
                    temporary,
                    compress=3,
                )
                os.replace(temporary, destination)
            finally:
                temporary.unlink(missing_ok=True)
            logger.info(
                "Saved model cache",
                extra={"event": "cache_saved", "cache_source": "local", "cache_path": cache_path},
            )
            _try_upload_cache_to_gcs(cache_key, cache_path)
        except Exception:
            logger.warning(
                "Failed to save model cache; models remain available in memory",
                extra={"event": "cache_save_failed", "cache_path": cache_path},
                exc_info=True,
            )

    return {
        "status": "success",
        "rows_loaded": len(df),
        "trained_models": trained,
        "skipped_models": skipped,
        "from_cache": None,
    }


def validate_csv_schema(df: pd.DataFrame) -> tuple[bool, list[str]]:
    errors: list[str] = []

    missing = [c for c in REQUIRED_COLUMNS if c not in df.columns]
    if missing:
        errors.append(f"Missing {len(missing)} required columns: {missing}")

    numeric_cols = [
        c for c in REQUIRED_COLUMNS
        if c not in CATEGORICAL_COLS and c != "datetime"
    ]
    for col in numeric_cols:
        if col not in df.columns:
            continue
        coerced = pd.to_numeric(df[col], errors="coerce")
        bad_mask = coerced.isna() & df[col].notna()
        if bad_mask.any():
            errors.append(f"Column '{col}' contains {int(bad_mask.sum())} non-numeric values.")

    for col in CATEGORICAL_COLS:
        if col in df.columns and df[col].dropna().astype(str).str.strip().eq("").all():
            errors.append(f"Column '{col}' does not contain any valid entries.")

    if "datetime" in df.columns:
        invalid_dates = pd.to_datetime(df["datetime"], errors="coerce").isna()
        if invalid_dates.any():
            errors.append(
                f"Column 'datetime' contains {int(invalid_dates.sum())} invalid date values."
            )

    if "AWD Adoption" in df.columns:
        vals = set(df["AWD Adoption"].dropna().astype(str).str.strip().unique())
        allowed = {"With AWD", "Without AWD"}
        unexpected = vals - allowed
        if unexpected and vals:
            errors.append(f"Column 'AWD Adoption' contains invalid entries {unexpected}. Allowed: {allowed}")

    if len(df) < MIN_ROWS_PER_TARGET:
        errors.append(f"The dataset must contain at least {MIN_ROWS_PER_TARGET} rows. Found: {len(df)}")

    return len(errors) == 0, errors


def load_simulation_csv(csv_path: str) -> dict[str, Any]:
    if not csv_path or not os.path.exists(csv_path):
        return {"status": "error", "message": f"Simulation file path not found: {csv_path}"}

    try:
        df = pd.read_csv(csv_path)
    except Exception as e:
        return {"status": "error", "message": f"Failed to read CSV dataset: {e}"}

    is_valid, errors = validate_csv_schema(df)
    if not is_valid:
        return {
            "status": "invalid_template",
            "message": "The uploaded CSV does not match the required schema template.",
            "errors": errors,
            "required_columns": REQUIRED_COLUMNS,
        }

    cache_key = _dataset_fingerprint(csv_path)
    return _load_and_train(df, cache_key=cache_key)


def _require_data() -> None:
    if data is None:
        raise ValueError(
            "No agricultural simulation data is currently loaded. "
            "Please call the tool 'upload_simulation_csv' with a valid CSV template first."
        )


# ── Cold Startup Initialization ───────────────────────────────────────────────

if os.path.exists(DEFAULT_CSV_PATH):
    _load_result = load_simulation_csv(DEFAULT_CSV_PATH)
    if _load_result.get("status") == "success":
        logger.info(
            "Loaded default simulation dataset",
            extra={"event": "dataset_loaded", "path": DEFAULT_CSV_PATH},
        )
    else:
        logger.error(
            "Failed to load default simulation dataset: %s",
            _load_result.get("message"),
            extra={"event": "dataset_load_failed", "path": DEFAULT_CSV_PATH},
        )
else:
    logger.warning(
        "Default simulation dataset was not found",
        extra={"event": "dataset_not_found", "path": DEFAULT_CSV_PATH},
    )


# ── MCP Exposed Tools ─────────────────────────────────────────────────────────

@mcp.tool()
def get_data_status() -> dict[str, Any]:
    """Retrieve metadata information regarding currently loaded datasets and prediction targets."""
    return {
        "data_loaded": data is not None,
        "rows_loaded": len(data) if data is not None else 0,
        "models_ready": len(models) > 0,
        "trained_targets": list(models.keys()),
        "required_columns": REQUIRED_COLUMNS,
        "categorical_columns": CATEGORICAL_COLS,
    }


@mcp.tool()
def get_scenarios() -> dict[str, Any]:
    """List unique categorical groups, seasons, climates, and AWD practice options available."""
    _require_data()
    assert data is not None

    result = {
        "scenario_groups":    data["Scenario Group"].dropna().unique().tolist(),
        "season_types":       data["Season Type"].dropna().unique().tolist(),
        "climate_types":      data["Climate Type"].dropna().unique().tolist(),
        "resource_scenarios": data["Resource Scenario"].dropna().unique().tolist(),
        "awd_options":        data["AWD Adoption"].dropna().unique().tolist(),
    }
    if "Scenario Name" in data.columns:
        result["scenario_names"] = data["Scenario Name"].dropna().unique().tolist()
    return result


@mcp.tool()
def get_aggregated_metrics(filters: dict[str, Any] = None) -> dict[str, Any]:
    """Aggregate all metrics and run sub-group segment comparisons based on given criteria filters."""
    _require_data()
    assert data is not None
    filtered = data.copy()

    if filters:
        for col, val in filters.items():
            if col in filtered.columns and val:
                filtered = filtered[filtered[col] == val]

    if filtered.empty:
        return {"status": "empty", "message": "No data matches the current filters."}

    summary: dict[str, Any] = {"total_records": len(filtered)}

    for col in AGG_NUMERIC_COLS:
        if col in filtered.columns:
            summary[_agg_key(col)] = float(filtered[col].mean())

    core_breakdown_cols = [
        c for c in ["Avg Yield", "Methane Emissions", "Profit Margin"]
        if c in filtered.columns
    ]
    if core_breakdown_cols and "AWD Adoption" in filtered.columns:
        summary["awd_comparison"] = (
            filtered.groupby("AWD Adoption")[core_breakdown_cols]
            .mean()
            .round(3)
            .to_dict(orient="index")
        )

    return summary


@mcp.tool()
def run_agricultural_simulation(combos: list[tuple]) -> list[dict[str, float]]:
    """
    Run predictive modeling evaluations across various farming parameters.
    combos: list of (awd_str, scenario_group_str, fert, pest, water)
    """
    _require_data()

    for combo in combos:
        for label, value in zip(
            SIMULATION_INPUT_LIMITS,
            (combo[2], combo[3], combo[4]),
        ):
            lower, upper = SIMULATION_INPUT_LIMITS[label]
            if not lower <= float(value) <= upper:
                raise ValueError(
                    f"{label} must be between {lower} and {upper}. Received {value}."
                )

    assert data is not None

    def encode(column: str, values: list[str]) -> np.ndarray:
        encoder = label_encoders.get(column)
        if encoder is not None:
            known = set(encoder.classes_)
            return np.array([
                encoder.transform([value])[0] if value in known else 0
                for value in values
            ])
        classes = sorted(data[column].dropna().astype(str).unique())
        mapping = {value: index for index, value in enumerate(classes)}
        return np.array([mapping.get(value, 0) for value in values])

    available = data[
        (data["Year"] == DEFAULT_SIMULATION_YEAR)
        & data["Scenario Group"].isin([combo[1] for combo in combos])
    ]
    valid_by_scenario = {
        scenario: group[AVERAGED_DIMENSIONS].drop_duplicates().to_dict(orient="records")
        for scenario, group in available.groupby("Scenario Group")
    }

    expanded: list[tuple[int, tuple, dict[str, str]]] = []
    for combo_index, combo in enumerate(combos):
        dimension_combos = valid_by_scenario.get(combo[1], [])
        if not dimension_combos:
            raise ValueError(
                f"No valid Resource Scenario, Season Type, and Climate Type combinations "
                f"exist for '{combo[1]}' in {DEFAULT_SIMULATION_YEAR}."
            )
        expanded.extend(
            (combo_index, combo, dimension_combo)
            for dimension_combo in dimension_combos
        )

    awd_strings = [item[1][0] for item in expanded]
    scenario_strings = [item[1][1] for item in expanded]

    raw = {
        "AWD_encoded": encode("AWD Adoption", awd_strings),
        "ScenarioGroup_encoded": encode("Scenario Group", scenario_strings),
        "Year": [DEFAULT_SIMULATION_YEAR] * len(expanded),
        "Resource Scenario_encoded": encode(
            "Resource Scenario", [item[2]["Resource Scenario"] for item in expanded]
        ),
        "Season Type_encoded": encode(
            "Season Type", [item[2]["Season Type"] for item in expanded]
        ),
        "Climate Type_encoded": encode(
            "Climate Type", [item[2]["Climate Type"] for item in expanded]
        ),
        "Fertilizer Usage": [item[1][2] for item in expanded],
        "Pesticide Usage": [item[1][3] for item in expanded],
        "Water Usage": [item[1][4] for item in expanded],
    }

    first_model = next(iter(models.values()))
    feature_order = list(first_model.feature_names_in_)
    X = pd.DataFrame(raw)[feature_order]

    results = {}
    for target, model in models.items():
        results[target] = model.predict(X).astype(float)

    result_df = pd.DataFrame(results)

    for index, (_, combo, _) in enumerate(expanded):
        _, scenario_group, fertilizer, pesticide, water = combo
        revenue = float(result_df.at[index, "Revenue"])
        production_cost = float(result_df.at[index, "Production Cost"])
        if not np.isfinite(revenue) or not np.isfinite(production_cost):
            raise ValueError("Simulation produced a non-finite Revenue or Production Cost value.")
        production_cost = max(0.0, production_cost)
        net_income = revenue - production_cost
        result_df.at[index, "Production Cost"] = production_cost
        result_df.at[index, "Net Income"] = net_income
        result_df.at[index, "Profit Margin"] = net_income / max(1.0, revenue) * 100.0

        avg_yield = max(0.0, _finite_float(result_df.at[index, "Avg Yield"]))
        methane = max(0.0, _finite_float(result_df.at[index, "Methane Emissions"]))
        result_df.at[index, "Avg Yield"] = float(avg_yield)
        result_df.at[index, "Methane Emissions"] = float(methane)
        result_df.at[index, "Emission Intensity"] = float(
            methane / max(1.0, avg_yield * 1000.0)
        )

    result_df["_combo_index"] = [item[0] for item in expanded]
    result_df.drop(columns=["Revenue"], errors="ignore", inplace=True)
    return (
        result_df.groupby("_combo_index", sort=True)
        .mean(numeric_only=True)
        .to_dict(orient="records")
    )


def get_prediction_intervals(
    prediction: dict[str, float],
    *,
    scenario_group: str,
    fertilizer_usage: float,
    pesticide_usage: float,
    water_usage: float,
) -> dict[str, dict[str, float]]:
    """Build validation-based P90 ranges, including formula-derived financials."""
    intervals: dict[str, dict[str, float]] = {}

    def target_interval(target: str, value: float, *, non_negative: bool = False):
        details = model_report.get("targets", {}).get(target, {})
        config = details.get("metrics", {}).get("prediction_interval", {})
        error = config.get("absolute_error")
        level = config.get("level")
        if error is None or level is None:
            return None
        lower = float(value) - float(error)
        upper = float(value) + float(error)
        if non_negative:
            lower = max(0.0, lower)
        return {"lower": float(lower), "upper": float(upper), "level": float(level)}

    def derived_interval(target: str, value: float, *, non_negative: bool = False):
        details = model_report.get("derived_targets", {}).get(target, {})
        config = details.get("metrics", {}).get("prediction_interval", {})
        error = config.get("absolute_error")
        level = config.get("level")
        if error is None or level is None:
            return None
        lower = float(value) - float(error)
        if non_negative:
            lower = max(0.0, lower)
        return {"lower": lower, "upper": float(value) + float(error), "level": float(level)}

    for target, non_negative in (("Avg Yield", True), ("Methane Emissions", True)):
        if target in prediction:
            interval = target_interval(target, prediction[target], non_negative=non_negative)
            if interval:
                intervals[target] = interval

    revenue = float(prediction.get("Net Income", 0.0) + prediction.get("Production Cost", 0.0))
    revenue_interval = target_interval("Revenue", revenue, non_negative=True)
    cost_interval = target_interval("Production Cost", prediction.get("Production Cost", 0.0), non_negative=True)
    if cost_interval:
        intervals["Production Cost"] = cost_interval
    if revenue_interval and cost_interval:
        level = min(revenue_interval["level"], cost_interval["level"])

        net_interval = {
            "lower": float(revenue_interval["lower"] - cost_interval["upper"]),
            "upper": float(revenue_interval["upper"] - cost_interval["lower"]),
            "level": level,
        }
        intervals["Net Income"] = net_interval
        revenue_lower = max(1.0, revenue_interval["lower"])
        revenue_upper = max(1.0, revenue_interval["upper"])
        intervals["Profit Margin"] = {
            "lower": float(net_interval["lower"] / revenue_upper * 100.0),
            "upper": float(net_interval["upper"] / revenue_lower * 100.0),
            "level": level,
        }
        for metric, non_negative in (("Net Income", False), ("Profit Margin", False)):
            preferred = derived_interval(metric, prediction[metric], non_negative=non_negative)
            if preferred:
                intervals[metric] = preferred

    yield_interval = intervals.get("Avg Yield")
    methane_interval = intervals.get("Methane Emissions")
    if yield_interval and methane_interval:
        yield_lower = max(1e-9, yield_interval["lower"])
        yield_upper = max(1e-9, yield_interval["upper"])
        intervals["Emission Intensity"] = {
            "lower": float(methane_interval["lower"] / (yield_upper * 1000.0)),
            "upper": float(methane_interval["upper"] / (yield_lower * 1000.0)),
            "level": min(yield_interval["level"], methane_interval["level"]),
        }

    return intervals


def _score_batch(preds: list[dict], target_methane: float) -> np.ndarray:
    yields   = np.array([p["Avg Yield"]        for p in preds])
    margins  = np.array([p["Profit Margin"]     for p in preds])
    methanes = np.array([p["Methane Emissions"] for p in preds])

    scores  = yields * 2.0 + margins
    overage = methanes - target_methane
    scores -= np.maximum(overage, 0) * 10.0
    return scores


@mcp.tool()
def get_kpi_change(metrics: list[str], scenario_group: str = "Business As Usual",
                    base_year: int = 2022, target_year: int = 2050) -> dict[str, Any]:
    """Calculate KPI variance projections dynamically between specified years under chosen practices."""
    _require_data()
    assert data is not None
    if "datetime" not in data.columns:
        raise ValueError("Dataset is missing the required 'datetime' column for year filtering.")

    df = data.copy()
    df["Year"] = df["datetime"].dt.year

    target_norm = scenario_group.strip().lower()
    group_mask = df["Scenario Group"].astype(str).str.strip().str.lower() == target_norm

    base = df[group_mask & (df["Year"] == base_year)]
    target = df[group_mask & (df["Year"] == target_year)]

    result = {}
    for m in metrics:
        if m not in df.columns:
            result[m] = {"error": f"Metric target '{m}' does not exist."}
            continue
        base_val = float(base[m].mean()) if not base.empty else None
        target_val = float(target[m].mean()) if not target.empty else None
        pct = None
        if base_val not in (None, 0) and target_val is not None:
            pct = round((target_val - base_val) / base_val * 100, 2)
        result[m] = {"base_value": base_val, "target_value": target_val, "pct_change": pct}

    return {
        "scenario_group": scenario_group,
        "base_year": base_year,
        "target_year": target_year,
        "kpis": result,
    }


if __name__ == "__main__":
    mcp.run()
