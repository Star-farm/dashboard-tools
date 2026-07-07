import re
import itertools
from enum import Enum
import numpy as np

import mcp_server
from mcp_server import (
    get_aggregated_metrics,
    run_agricultural_simulation,
    get_scenarios,
    _score_batch
)

# ── Canonical Lookup Tables ──────────────────────────────────────────────────

DIMENSION_MAP = {
    "climate":           "Climate Type",
    "season":            "Season Type",
    "scenario":          "Scenario Group",
    "scenario name":     "Scenario Name",
    "awd":               "AWD Adoption",
    "resource":          "Resource Scenario",
    "year":              "Year",
}

METRIC_MAP = {
    "emission intensity":  "Emission Intensity",
    "flood stress":        "Flood Stress",
    "salinity stress":     "Salinity Stress",
    "drought stress":      "Drought Stress",
    "water reliability":   "Water Reliability",
    "resilient varieties": "Resilient Varieties",
    "labor intensity":     "Labor Intensity",
    "max flood":           "Max Flood Continuous",
    "production cost":     "Production Cost",
    "straw value":         "Straw Value",
    "net income":          "Net Income",
    "profit margin":       "Profit Margin",
    "avg yield":           "Avg Yield",
    "yield":               "Avg Yield",
    "methane":             "Methane Emissions",
    "emission":            "Methane Emissions",
    "profit":              "Profit Margin",
    "income":              "Net Income",
    "cost":                "Production Cost",
    "water":               "Water Usage",
    "fertilizer":          "Fertilizer Usage",
    "pesticide":           "Pesticide Usage",
    "salinity":            "Salinity Exposure",
    "flood":               "Max Flood Continuous",
    "drought":             "Drought Stress",
    "biodiversity":        "Biodiversity",
    "resilient":           "Resilient Varieties",
    "reliability":         "Water Reliability",
    "labor":               "Labor Intensity",
    "straw":               "Straw Value",
}

DEFAULT_METRICS = [
    "Avg Yield",
    "Methane Emissions",
    "Emission Intensity",
    "Profit Margin",
    "Net Income",
    "Water Usage",
    "Water Reliability",
    "Biodiversity",
    "Labor Intensity",
]

METRIC_LABELS = {
    "Avg Yield":              ("-", "t/ha"),
    "Methane Emissions":      ("-", "kg CH4/ha"),
    "Emission Intensity":     ("-", "kg CH4/t Rice"),
    "Profit Margin":          ("-", "%"),
    "Net Income":             ("-", "$/ha"),
    "Production Cost":        ("-", "$/ha"),
    "Straw Value":            ("-", "$/ha"),
    "Water Usage":            ("-", "mm/ha"),
    "Fertilizer Usage":       ("-", "kg NH4/ha"),
    "Pesticide Usage":        ("-", "kg/ha"),
    "Salinity Exposure":      ("-", "ppt"),
    "Max Flood Continuous":   ("-", "days"),
    "Flood Stress":           ("-", "index"),
    "Drought Stress":         ("-", "index"),
    "Salinity Stress":        ("-", "index"),
    "Biodiversity":           ("-", "index"),
    "Resilient Varieties":    ("-", "%"),
    "Water Reliability":      ("-", "%"),
    "Labor Intensity":        ("-", "hours/ha"),
}

PRED_KEY_LABELS = {
    "Avg Yield":              ("-", "t/ha",       ".2f"),
    "Methane Emissions":      ("-", "kg/ha",      ".1f"),
    "Emission Intensity":     ("-", "kg CO₂e/t",  ".2f"),
    "Profit Margin":          ("-", "%",          ".1f"),
    "Net Income":             ("-", "$/ha",       ",.0f"),
    "Production Cost":        ("-", "$/ha",       ",.0f"),
    "Straw Value":            ("-", "$/ha",       ",.0f"),
    "Water Reliability":      ("-", "%",          ".1f"),
    "Biodiversity":           ("-", "index",      ".3f"),
    "Resilient Varieties":    ("-", "%",          ".1f"),
    "Labor Intensity":        ("-", "hours/ha",   ".1f"),
    "Flood Stress":           ("-", "index",      ".3f"),
    "Drought Stress":         ("-", "index",      ".3f"),
    "Salinity Stress":        ("-", "index",      ".3f"),
}

COLUMN_NAME_OVERRIDES = {
    "Scenario Groups": "Scenario Group",
    "Awd Options":      "AWD Adoption"
}


# ── Shared Helper Functions ───────────────────────────────────────────────────

def _resolve_dimension(raw: str) -> str | None:
    """Map a free-text dimension phrase to a DataFrame column name, or None."""
    raw = raw.strip().lower()
    for key in sorted(DIMENSION_MAP, key=len, reverse=True):
        if key in raw:
            return DIMENSION_MAP[key]
    return None


def _resolve_metrics(raw: str) -> list[str]:
    """Map a free-text metric phrase to a deduplicated list of column names."""
    raw = raw.strip().lower()
    if any(word in raw for word in ("all", "everything", "every metric")):
        return list(DEFAULT_METRICS)

    seen, cols = set(), []
    for key in sorted(METRIC_MAP, key=len, reverse=True):
        if key in raw:
            col = METRIC_MAP[key]
            if col not in seen:
                seen.add(col)
                cols.append(col)

    return cols if cols else list(DEFAULT_METRICS)


def _fmt_val(val: float, fmt: str) -> str:
    try:
        return format(val, fmt)
    except (ValueError, TypeError):
        return str(val)


def _format_predictions(preds: dict) -> str:
    lines = []
    for col, (icon, unit, fmt) in PRED_KEY_LABELS.items():
        if col in preds:
            val = preds[col]
            lines.append(f"  {icon} {col}: {_fmt_val(val, fmt)} {unit}")
    return "\n".join(lines)


def _extract_numeric(pattern: str, text: str, default: float) -> float:
    """Safely extract a float value using regex pattern."""
    match = re.search(pattern, text)
    if match:
        try:
            return float(match.group(1))
        except (ValueError, TypeError):
            pass
    return default


# ── Agent Base Class ──────────────────────────────────────────────────────────

class Agent:
    def __init__(self, name: str, role: str, description: str):
        self.name = name
        self.role = role
        self.description = description

    def execute(self, task: str, **kwargs) -> dict:
        raise NotImplementedError("Agents must implement the execute method.")


# ── AggregationAgent ──────────────────────────────────────────────────────────

class AggregationAgent(Agent):
    def __init__(self):
        super().__init__(
            name="Agricultural Statistics Analyst",
            role="Data Aggregation & Scenario Comparison",
            description=(
                "Aggregates all performance metrics (yield, emissions, water reliability, "
                "biodiversity, labor, stress indices, financials) across climate, seasons, "
                "scenarios, and resource scenarios."
            )
        )

    def execute(self, task: str, **kwargs) -> dict:
        filters = kwargs.get("filters", {})
        dimension = kwargs.get("dimension")
        metrics = kwargs.get("metrics")

        # 'Year' is derived from 'datetime', so it is excluded from base metrics filter.
        agg_filters = {k: v for k, v in filters.items() if k != "Year"}
        summary = get_aggregated_metrics(agg_filters)

        current_data = mcp_server.data
        if current_data is None or current_data.empty:
            return summary

        if dimension:
            working_data = current_data
            year_filter_val = filters.get("Year")
            needs_year_col = (dimension == "Year") or (year_filter_val not in (None, ""))

            # Inject a temporary 'Year' column if needed for dimension grouping or filtering
            if needs_year_col and "datetime" in working_data.columns:
                working_data = working_data.copy()
                working_data["Year"] = working_data["datetime"].dt.year

            if dimension not in working_data.columns:
                summary["compare_error"] = f"Column '{dimension}' not found in dataset."
                return summary

            filtered_data = working_data
            for col, val in filters.items():
                if col in filtered_data.columns and val not in (None, ""):
                    if col == "Year":
                        try:
                            filtered_data = filtered_data[filtered_data[col] == int(val)]
                        except ValueError:
                            pass
                    else:
                        filtered_data = filtered_data[filtered_data[col] == val]

            requested = metrics if metrics else list(DEFAULT_METRICS)
            cols_to_group = [c for c in requested if c in filtered_data.columns]

            if not cols_to_group:
                summary["compare_error"] = "None of the requested metric columns exist in the dataset."
                return summary

            if filtered_data.empty:
                breakdown = {}
            else:
                group_key = filtered_data[dimension].astype(str) if dimension == "Year" else dimension
                breakdown = (
                    filtered_data.groupby(group_key)[cols_to_group]
                    .mean()
                    .round(3)
                    .to_dict(orient="index")
                )

            summary.update({
                "compare_dimension": dimension,
                "compare_metrics":   cols_to_group,
                "compare_breakdown": breakdown
            })

        return summary


# ── ModelingAgent ─────────────────────────────────────────────────────────────

class TaskType(Enum):
    SIMULATE     = "simulate"
    OPTIMIZE_RES = "optimize_resource"
    OPTIMIZE     = "optimize"
    UNKNOWN      = "unknown"


def _classify(task: str) -> TaskType:
    t = task.lower()
    if "optimize_resource" in t:
        return TaskType.OPTIMIZE_RES
    if "optimize" in t:
        return TaskType.OPTIMIZE
    if any(kw in t for kw in ("simulate", "run", "predict")):
        return TaskType.SIMULATE
    return TaskType.UNKNOWN


class ModelingAgent(Agent):
    AWD_OPTIONS      = ["With AWD", "Without AWD"]
    SCENARIO_OPTIONS = ["Business As Usual", "One Million Hectare Rice"]
    FERT_GRID        = [50.0, 75.0, 100.0, 125.0, 150.0, 175.0, 200.0, 225.0, 250.0]
    WATER_GRID       = [200.0, 300.0, 400.0, 500.0, 600.0, 700.0, 800.0, 900.0, 1000.0, 1100.0, 1200.0]
    PEST_GRID        = [1.0, 3.0, 5.0, 7.0, 10.0, 13.0, 15.0]

    def __init__(self):
        super().__init__(
            name="Agricultural Yield & Emission Predictor",
            role="Predictive Modeling & Resource Optimizer",
            description=(
                "Simulates crop outcomes across all indicators and optimizes "
                "water/fertilizer/pesticide/AWD/scenario-group inputs to meet user-defined targets."
            )
        )

    def _build_combos(self, resources: list, fixed: dict) -> list[tuple]:
        """Generate grid search combinations: (awd, scenario_group, fert, pest, water)."""
        awd      = self.AWD_OPTIONS      if "awd"            in resources else [fixed.get("awd_adoption",   "With AWD")]
        scenario = self.SCENARIO_OPTIONS if "scenario_group" in resources else [fixed.get("scenario_group", "Business As Usual")]
        fert     = self.FERT_GRID        if "fertilizer"     in resources else [fixed.get("fertilizer_usage", 100.0)]
        pest     = self.PEST_GRID        if "pesticide"      in resources else [fixed.get("pesticide_usage",   5.0)]
        water    = self.WATER_GRID       if "water"          in resources else [fixed.get("water_usage",     600.0)]
        return list(itertools.product(awd, scenario, fert, pest, water))

    def _best_from_combos(self, combos: list[tuple], target_methane: float) -> tuple[dict, float]:
        preds = run_agricultural_simulation(combos)
        scores = _score_batch(preds, target_methane)
        best_idx = int(np.argmax(scores))
        best_combo = combos[best_idx]
        return {
            "inputs": {
                "AWD Adoption":     best_combo[0],
                "Scenario Group":   best_combo[1],
                "Fertilizer Usage": best_combo[2],
                "Pesticide Usage":  best_combo[3],
                "Water Usage":      best_combo[4],
            },
            "predictions": preds[best_idx],
        }, float(scores[best_idx])

    def execute(self, task: str, **kwargs) -> dict:
        match _classify(task):

            case TaskType.SIMULATE:
                combo = [(
                    kwargs.get("awd_adoption",     "With AWD"),
                    kwargs.get("scenario_group",   "Business As Usual"),
                    kwargs.get("fertilizer_usage", 100.0),
                    kwargs.get("pesticide_usage",    5.0),
                    kwargs.get("water_usage",       600.0),
                )]
                preds = run_agricultural_simulation(combo)
                return {
                    "inputs": {
                        "AWD Adoption":     combo[0][0],
                        "Scenario Group":   combo[0][1],
                        "Fertilizer Usage": combo[0][2],
                        "Pesticide Usage":  combo[0][3],
                        "Water Usage":      combo[0][4],
                    },
                    "predictions": preds[0],
                }

            case TaskType.OPTIMIZE_RES:
                resources      = kwargs.get("resources", [])
                fixed          = kwargs.get("fixed_inputs", {})
                target_methane = kwargs.get("target_methane", 500.0)
                combos         = self._build_combos(resources, fixed)
                best_sim, best_score = self._best_from_combos(combos, target_methane)
                label = " + ".join(r.title() for r in resources) or "All Inputs"
                return {
                    "optimization_target": f"Optimal {label} (Methane ceiling: {target_methane} kg/ha)",
                    "best_score":          best_score,
                    "optimized_inputs":    best_sim["inputs"],
                    "expected_outcomes":   best_sim["predictions"],
                }

            case TaskType.OPTIMIZE:
                target_methane = kwargs.get("target_methane", 200.0)
                fixed = {
                    "pesticide_usage": kwargs.get("pesticide_usage", 5.0),
                    "scenario_group":  kwargs.get("scenario_group", "Business As Usual"),
                }
                combos = self._build_combos(["awd", "fertilizer", "water"], fixed)
                best_sim, best_score = self._best_from_combos(combos, target_methane)
                return {
                    "optimization_target": f"Maximize performance with Methane Emissions <= {target_methane}",
                    "best_score":          best_score,
                    "optimized_inputs":    best_sim["inputs"],
                    "expected_outcomes":   best_sim["predictions"],
                }

            case _:
                return {"error": f"Task '{task}' not supported by {self.name}."}


# ── AgentOrchestrator ─────────────────────────────────────────────────────────

class AgentOrchestrator:
    def __init__(self):
        self.agg_agent   = AggregationAgent()
        self.model_agent = ModelingAgent()

    def _format_compare_text(self, result: dict) -> str:
        dimension = result.get("compare_dimension", "Group")
        metrics   = result.get("compare_metrics", [])
        breakdown = result.get("compare_breakdown", {})

        if not breakdown:
            return f"No data found to compare by {dimension}."

        lines = [f"Comparison by {dimension} ({result.get('total_records', 0)} records):", ""]
        for group, values in sorted(breakdown.items()):
            lines.append(f"▸ {group}")
            for metric in metrics:
                if metric in values:
                    icon, unit = METRIC_LABELS.get(metric, ("•", ""))
                    val = values[metric]
                    fmt = f"{val:,.0f}" if unit == "$/ha" else f"{val:.3f}"
                    lines.append(f"  {icon} {metric}: {fmt} {unit}")
            lines.append("")
        return "\n".join(lines).rstrip()

    def _format_inputs(self, inputs: dict) -> str:
        return (
            f"  • Scenario Group: {inputs.get('Scenario Group', '-')}\n"
            f"  • AWD Adoption:   {inputs.get('AWD Adoption', '-')}\n"
            f"  • Fertilizer:     {inputs.get('Fertilizer Usage', '-')} kg/ha\n"
            f"  • Water:          {inputs.get('Water Usage', '-')} m³/ha\n"
            f"  • Pesticide:      {inputs.get('Pesticide Usage', '-')} kg/ha"
        )

    def process_query(self, query: str, context: dict = None) -> dict:
        query_lower = query.lower().strip()
        context     = context or {}

        # ── 0. Parse 'Compare X by Y' queries ─────────────────────────────────
        compare_match = re.search(
            r'\bcompare\b\s+(.+?)\s+\bby\b\s+(.+?)(?:\s+\bin\b\s+(.+))?$',
            query_lower
        )
        if compare_match:
            raw_metrics   = compare_match.group(1)
            raw_dimension = compare_match.group(2)
            raw_filter    = compare_match.group(3)

            dimension = _resolve_dimension(raw_dimension)
            metrics   = _resolve_metrics(raw_metrics)

            if not dimension:
                available = ", ".join(DIMENSION_MAP.keys())
                return {
                    "agent":  self.agg_agent.name,
                    "role":   self.agg_agent.role,
                    "result": {"error": f"Unknown dimension '{raw_dimension}'."},
                    "text":   (
                        f"I don't recognise '{raw_dimension}' as a grouping dimension.\n"
                        f"Available options: {available}."
                    ),
                }

            filters = dict(context.get("filters", {}))
            if raw_filter:
                scenarios_info = get_scenarios()
                for key, options in scenarios_info.items():
                    col_name = key.replace("_", " ").title()
                    col_name = COLUMN_NAME_OVERRIDES.get(col_name, col_name)
                    for opt in options:
                        if opt.lower() in raw_filter:
                            filters[col_name] = opt

            result = self.agg_agent.execute(
                query, filters=filters, dimension=dimension, metrics=metrics
            )
            return {
                "agent":  self.agg_agent.name,
                "role":   self.agg_agent.role,
                "result": result,
                "text":   self._format_compare_text(result),
            }

        # ── 1. Parse Simulation queries ───────────────────────────────────────
        elif any(kw in query_lower for kw in ("simulate", "predict", "run", "forecast")):
            awd_match = re.search(r'(with awd|without awd)', query_lower)
            awd       = awd_match.group(1).title() if awd_match else context.get("awd_adoption", "With AWD")

            scenario_m = re.search(r'\b(business as usual|one million hectare rice)\b', query_lower)
            scenario   = scenario_m.group(1).title() if scenario_m else context.get("scenario_group", "Business As Usual")

            fert  = _extract_numeric(r'fertilizer\s*[:=]?\s*(\d+)', query_lower, context.get("fertilizer_usage", 100.0))
            water = _extract_numeric(r'water\s*[:=]?\s*(\d+)', query_lower, context.get("water_usage", 600.0))
            pest  = _extract_numeric(r'pesticide\s*[:=]?\s*(\d+)', query_lower, context.get("pesticide_usage", 5.0))

            result = self.model_agent.execute(
                "simulate",
                awd_adoption=awd, scenario_group=scenario, fertilizer_usage=fert,
                pesticide_usage=pest, water_usage=water,
            )

            inputs = result["inputs"]
            preds  = result["predictions"]
            text_desc = (
                f"Simulation Inputs:\n{self._format_inputs(inputs)}\n\n"
                f"Predicted Outcomes:\n{_format_predictions(preds)}"
            )
            return {
                "agent":  self.model_agent.name,
                "role":   self.model_agent.role,
                "result": result,
                "text":   text_desc,
            }

        # ── 2. Parse Optimization queries ─────────────────────────────────────
        elif "optimize" in query_lower:
            resource_keywords = {
                "water": "water", "fertilizer": "fertilizer",
                "pesticide": "pesticide", "awd": "awd",
            }
            resources_to_optimize = [
                res for kw, res in resource_keywords.items() if kw in query_lower
            ]
            has_methane_target = bool(re.search(r'methane', query_lower))

            if resources_to_optimize and not has_methane_target:
                target_methane = _extract_numeric(
                    r'methane\s*(?:below|under|<=|less than)?\s*(\d+)', 
                    query_lower, 
                    500.0
                )

                fixed_inputs = {
                    "awd_adoption":     context.get("awd_adoption",     "With AWD"),
                    "scenario_group":   context.get("scenario_group",   "Business As Usual"),
                    "fertilizer_usage": context.get("fertilizer_usage", 100.0),
                    "water_usage":      context.get("water_usage",      600.0),
                    "pesticide_usage":  context.get("pesticide_usage",  5.0),
                }
                
                for param, key in [("water", "water_usage"), ("fertilizer", "fertilizer_usage"), ("pesticide", "pesticide_usage")]:
                    if param not in resources_to_optimize:
                        fixed_inputs[key] = _extract_numeric(
                            rf'{param}\s*(?:equal|to|=|at|:)?\s*(\d+)', 
                            query_lower, 
                            fixed_inputs[key]
                        )

                result = self.model_agent.execute(
                    "optimize_resource",
                    resources=resources_to_optimize,
                    fixed_inputs=fixed_inputs,
                    target_methane=target_methane,
                )

                inputs = result.get("optimized_inputs", {})
                preds  = result.get("expected_outcomes", {})
                label  = " + ".join(r.title() for r in resources_to_optimize)

                if inputs:
                    text_desc = (
                        f"Optimal {label} Settings:\n{self._format_inputs(inputs)}\n\n"
                        f"Expected Outcomes:\n{_format_predictions(preds)}"
                    )
                else:
                    text_desc = f"Could not find an optimal {label} configuration."

                return {
                    "agent":  self.model_agent.name,
                    "role":   self.model_agent.role,
                    "result": result,
                    "text":   text_desc,
                }

            target_methane = _extract_numeric(
                r'methane\s*(?:below|under|<=|less than|equal|to|at)?\s*(\d+)', 
                query_lower, 
                context.get("target_methane", 200.0)
            )
            pest_val       = context.get("pesticide_usage", 5.0)
            scenario_val   = context.get("scenario_group", "Business As Usual")

            result = self.model_agent.execute(
                "optimize",
                target_methane=target_methane,
                pesticide_usage=pest_val,
                scenario_group=scenario_val,
            )

            inputs = result.get("optimized_inputs", {})
            preds  = result.get("expected_outcomes", {})

            if inputs:
                text_desc = (
                    f"Optimized for Methane ≤ {target_methane} kg/ha:\n"
                    f"{self._format_inputs(inputs)}\n\n"
                    f"Expected Outcomes:\n{_format_predictions(preds)}"
                )
            else:
                text_desc = f"Could not find an allocation meeting Methane ≤ {target_methane} kg/ha."

            return {
                "agent":  self.model_agent.name,
                "role":   self.model_agent.role,
                "result": result,
                "text":   text_desc,
            }

        # ── 3. Fallback Route ─────────────────────────────────────────────────
        else:
            return {
                "agent":  self.agg_agent.name,
                "role":   self.agg_agent.role,
                "result": {"error": f"Unrecognized query: '{query}'."},
                "text":   f"Query not recognized: '{query}'. Expected 'compare X by Y', 'simulate', or 'optimize'.",
            }