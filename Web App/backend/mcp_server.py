import os
import hashlib
import joblib
from typing import Any
import numpy as np
import pandas as pd
from mcp.server.fastmcp import FastMCP
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import LabelEncoder


# ── FastMCP Server Initialization ─────────────────────────────────────────────
mcp = FastMCP("AI Agents Agricultural Modeling")
DEFAULT_CSV_PATH = os.getenv("DEFAULT_CSV_PATH", "data/Simulation_Data.csv")
MODEL_CACHE_DIR = os.getenv("MODEL_CACHE_DIR", "/tmp/model_cache")  # /tmp ghi được trên Cloud Run
GCS_CACHE_BUCKET = os.getenv("GCS_CACHE_BUCKET", "")  # để trống = tắt GCS cache, chỉ dùng local

# ── Global State Storage ──────────────────────────────────────────────────────
data: pd.DataFrame | None = None
models: dict[str, RandomForestRegressor] = {}
label_encoders: dict[str, LabelEncoder] = {}

# ── Feature & Label Schemas ───────────────────────────────────────────────────
INPUT_FEATURES = [
    "AWD Adoption",
    "Scenario Group",
    "Fertilizer Usage",
    "Pesticide Usage",
    "Water Usage",
]

PREDICTION_TARGETS = [
    "Avg Yield",
    "Methane Emissions",
    "Emission Intensity",
    "Profit Margin",
    "Net Income",
    "Production Cost",
    "Straw Value",
    "Water Reliability",
    "Biodiversity",
    "Resilient Varieties",
    "Labor Intensity",
    "Flood Stress",
    "Drought Stress",
    "Salinity Stress",
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
    CATEGORICAL_COLS + INPUT_FEATURES + PREDICTION_TARGETS + AGG_NUMERIC_COLS
))

SAMPLE_COLUMN_ORDER = list(dict.fromkeys(
    CATEGORICAL_COLS + INPUT_FEATURES + PREDICTION_TARGETS + AGG_NUMERIC_COLS
))

MIN_ROWS_PER_TARGET = 10


# ── Shared Private Helpers ────────────────────────────────────────────────────

def _dataset_fingerprint(csv_path: str) -> str:
    """Mã định danh dựa trên nội dung thực sự của file, không đổi khi chỉ redeploy."""
    hasher = hashlib.md5()
    with open(csv_path, "rb") as f:
        # Đọc theo chunk để tránh load cả file lớn vào RAM cùng lúc
        for chunk in iter(lambda: f.read(8192), b""):
            hasher.update(chunk)
    return hasher.hexdigest()[:12]


def _gcs_blob_name(cache_key: str) -> str:
    return f"model-cache/{cache_key}.joblib"


def _try_download_cache_from_gcs(cache_key: str, local_path: str) -> bool:
    """Thử tải cache từ GCS về local. Trả về True nếu tải thành công."""
    if not GCS_CACHE_BUCKET:
        return False
    try:
        from google.cloud import storage
        client = storage.Client()
        bucket = client.bucket(GCS_CACHE_BUCKET)
        blob = bucket.blob(_gcs_blob_name(cache_key))
        if blob.exists():
            os.makedirs(os.path.dirname(local_path), exist_ok=True)
            blob.download_to_filename(local_path)
            print(f"[mcp_server] Downloaded model cache from GCS: gs://{GCS_CACHE_BUCKET}/{_gcs_blob_name(cache_key)}")
            return True
    except Exception as e:
        print(f"[mcp_server] GCS cache download failed (non-fatal): {e}")
    return False


def _try_upload_cache_to_gcs(cache_key: str, local_path: str) -> None:
    """Upload cache vừa train lên GCS, để lần cold start sau dùng lại. Lỗi ở đây không làm fail request."""
    if not GCS_CACHE_BUCKET:
        return
    try:
        from google.cloud import storage
        client = storage.Client()
        bucket = client.bucket(GCS_CACHE_BUCKET)
        blob = bucket.blob(_gcs_blob_name(cache_key))
        blob.upload_from_filename(local_path)
        print(f"[mcp_server] Uploaded model cache to GCS: gs://{GCS_CACHE_BUCKET}/{_gcs_blob_name(cache_key)}")
    except Exception as e:
        print(f"[mcp_server] GCS cache upload failed (non-fatal): {e}")

def _agg_key(col: str) -> str:
    normalized = col.lower().replace(" ", "_")
    if normalized.startswith("avg_"):
        return normalized
    return f"avg_{normalized}"


def _load_and_train(df: pd.DataFrame, cache_key: str | None = None) -> dict[str, Any]:
    global data, models, label_encoders

    df = df.copy()

    if "datetime" in df.columns:
        df["datetime"] = pd.to_datetime(df["datetime"], errors="coerce")

    for col in CATEGORICAL_COLS:
        if col in df.columns:
            df[col] = df[col].astype(str).str.strip()

    cache_path = os.path.join(MODEL_CACHE_DIR, f"{cache_key}.joblib") if cache_key else None

    # ── Lớp 1: cache local (trong vòng đời container hiện tại) ─────────────
    if cache_path and os.path.exists(cache_path):
        try:
            cached = joblib.load(cache_path)
            data = df
            models = cached["models"]
            label_encoders = cached["label_encoders"]
            print(f"[mcp_server] Loaded models from local cache: {cache_path}")
            return {
                "status": "success", "rows_loaded": len(df),
                "trained_models": list(models.keys()), "skipped_models": [],
                "from_cache": "local",
            }
        except Exception as e:
            print(f"[mcp_server] Local cache load failed ({e}), trying GCS/training.")

    # ── Lớp 2: cache trên GCS (sống sót qua các lần cold start) ────────────
    if cache_path and cache_key and _try_download_cache_from_gcs(cache_key, cache_path):
        try:
            cached = joblib.load(cache_path)
            data = df
            models = cached["models"]
            label_encoders = cached["label_encoders"]
            print(f"[mcp_server] Loaded models from GCS cache.")
            return {
                "status": "success", "rows_loaded": len(df),
                "trained_models": list(models.keys()), "skipped_models": [],
                "from_cache": "gcs",
            }
        except Exception as e:
            print(f"[mcp_server] GCS cache file corrupted ({e}), retraining from scratch.")

    # ── Không có cache hợp lệ → train như cũ ───────────────────────────────
    new_label_encoders = {}

    le_awd = LabelEncoder()
    df["AWD_encoded"] = le_awd.fit_transform(df["AWD Adoption"])
    new_label_encoders["AWD Adoption"] = le_awd

    le_scenario = LabelEncoder()
    df["ScenarioGroup_encoded"] = le_scenario.fit_transform(df["Scenario Group"])
    new_label_encoders["Scenario Group"] = le_scenario

    X_all = df[["AWD_encoded", "ScenarioGroup_encoded", "Fertilizer Usage", "Pesticide Usage", "Water Usage"]]

    new_models = {}
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
        model.fit(X_train, y_train)
        new_models[target] = model
        trained.append(target)

    if not new_models:
        return {
            "status": "error",
            "message": "Failed to train any regression models due to insufficient row data per target column.",
            "skipped": skipped,
        }

    data = df
    models = new_models
    label_encoders = new_label_encoders

    # ── Lưu cache: local trước, rồi upload GCS ──────────────────────────────
    if cache_path and cache_key:
        try:
            os.makedirs(os.path.dirname(cache_path), exist_ok=True)
            joblib.dump(
                {"models": new_models, "label_encoders": new_label_encoders},
                cache_path,
                compress=3,
            )
            print(f"[mcp_server] Saved model cache locally: {cache_path}")
            _try_upload_cache_to_gcs(cache_key, cache_path)
        except Exception as e:
            print(f"[mcp_server] Failed to save model cache: {e}")

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

    numeric_cols = [c for c in REQUIRED_COLUMNS if c not in CATEGORICAL_COLS]
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
        print(f"[mcp_server] Automatically loaded {DEFAULT_CSV_PATH} "
              f"({_load_result['rows_loaded']} rows, models: {_load_result['trained_models']}).")
    else:
        print(f"[mcp_server] Failed to automatically load {DEFAULT_CSV_PATH}: {_load_result.get('message')}")
else:
    print(f"[mcp_server] Default simulation data not found at {DEFAULT_CSV_PATH}.")


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

    awd_strings      = [c[0] for c in combos]
    scenario_strings = [c[1] for c in combos]

    try:
        awd_encoded = label_encoders["AWD Adoption"].transform(awd_strings)
    except Exception:
        awd_encoded = np.array([1 if a == "With AWD" else 0 for a in awd_strings])

    try:
        scenario_encoded = label_encoders["Scenario Group"].transform(scenario_strings)
    except Exception:
        known = list(label_encoders["Scenario Group"].classes_) if "Scenario Group" in label_encoders else []
        scenario_encoded = np.array([
            label_encoders["Scenario Group"].transform([s])[0] if s in known else 0
            for s in scenario_strings
        ])

    raw = {
        "AWD_encoded":            awd_encoded,
        "ScenarioGroup_encoded":  scenario_encoded,
        "Fertilizer Usage":       [c[2] for c in combos],
        "Pesticide Usage":        [c[3] for c in combos],
        "Water Usage":            [c[4] for c in combos],
    }

    first_model = next(iter(models.values()))
    feature_order = list(first_model.feature_names_in_)
    X = pd.DataFrame(raw)[feature_order]

    results = {}
    for target, model in models.items():
        results[target] = model.predict(X).astype(float)

    return pd.DataFrame(results).to_dict(orient="records")


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
                    base_year: int = 2024, target_year: int = 2050) -> dict[str, Any]:
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