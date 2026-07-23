"""Thin MCP adapter over pre-trained agricultural model services."""

import os
from typing import Any
import numpy as np
import pandas as pd
from mcp.server.fastmcp import FastMCP
from app.ml.model_config import (
    AGG_NUMERIC_COLS,
    AVERAGED_DIMENSIONS,
    CATEGORICAL_COLS,
    DEFAULT_SIMULATION_YEAR,
    REQUIRED_COLUMNS,
    SIMULATION_INPUT_LIMITS,
)
from app.ml.runtime import load_serving_state


# ── FastMCP Server Initialization ─────────────────────────────────────────────
mcp = FastMCP("AI Agents Agricultural Modeling")

# VPS Config
DEFAULT_CSV_PATH = os.getenv("DEFAULT_CSV_PATH", "/app/data/Simulation_Data.csv")
MODEL_CACHE_DIR = os.getenv("MODEL_CACHE_DIR", "/app/model_cache") 

# ── Global State Storage ──────────────────────────────────────────────────────
serving_state = load_serving_state(DEFAULT_CSV_PATH, MODEL_CACHE_DIR)
data = serving_state.data
models = serving_state.bundle.models
label_encoders = serving_state.bundle.label_encoders
model_report = serving_state.bundle.model_report

# ── Feature & Label Schemas ───────────────────────────────────────────────────
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


def _require_data() -> None:
    if data is None:
        raise ValueError(
            "No agricultural simulation data is currently loaded. "
            "Please call the tool 'upload_simulation_csv' with a valid CSV template first."
        )


# ── Cold Startup Initialization ───────────────────────────────────────────────

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
            "Resource Scenario",
            [item[2]["Resource Scenario"] for item in expanded],
        ),
        "Season Type_encoded": encode(
            "Season Type",
            [item[2]["Season Type"] for item in expanded],
        ),
        "Climate Type_encoded": encode(
            "Climate Type",
            [item[2]["Climate Type"] for item in expanded],
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

    for index, _ in enumerate(expanded):
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
    return result_df.groupby("_combo_index", sort=True).mean(numeric_only=True).to_dict(orient="records")


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
        net_interval = {"lower": float(revenue_interval["lower"] - cost_interval["upper"]), "upper": float(revenue_interval["upper"] - cost_interval["lower"]), "level": level}
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
