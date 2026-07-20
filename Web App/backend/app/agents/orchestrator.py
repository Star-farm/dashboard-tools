"""Agent classification, modeling, and orchestration implementation."""

import itertools
from enum import Enum
import numpy as np

import mcp_server
from mcp_server import (
    get_aggregated_metrics,
    run_agricultural_simulation,
    _score_batch
)


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


# ── Shared Helper Functions ───────────────────────────────────────────────────

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

            # Inject temporary 'Year' column if needed for dimension grouping or filtering
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

    def process_query(self, task: str, context: dict = None) -> dict:
        """Route an explicit task to the appropriate agent.

        Args:
            task: One of 'compare', 'simulate', or 'optimize'.
            context: Structured parameters for the task.
        """
        context = context or {}

        # ── Compare ───────────────────────────────────────────────────────────
        if task == "compare":
            dimension = context.get("dimension")
            metrics   = context.get("metrics")
            filters   = context.get("filters", {})

            if not dimension:
                return {
                    "agent":  self.agg_agent.name,
                    "role":   self.agg_agent.role,
                    "result": {"error": "No dimension specified for comparison."},
                    "text":   "No dimension specified for comparison.",
                }

            result = self.agg_agent.execute(
                task, filters=filters, dimension=dimension, metrics=metrics
            )
            return {
                "agent":  self.agg_agent.name,
                "role":   self.agg_agent.role,
                "result": result,
                "text":   self._format_compare_text(result),
            }

        # ── Simulate ──────────────────────────────────────────────────────────
        elif task == "simulate":
            result = self.model_agent.execute(
                "simulate",
                awd_adoption=context.get("awd_adoption", "With AWD"),
                scenario_group=context.get("scenario_group", "Business As Usual"),
                fertilizer_usage=context.get("fertilizer_usage", 100.0),
                pesticide_usage=context.get("pesticide_usage", 5.0),
                water_usage=context.get("water_usage", 600.0),
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

        # ── Optimize ──────────────────────────────────────────────────────────
        elif task == "optimize":
            target_methane = context.get("target_methane", 200.0)
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

        # ── Unknown Task ──────────────────────────────────────────────────────
        else:
            return {
                "agent":  self.agg_agent.name,
                "role":   self.agg_agent.role,
                "result": {"error": f"Unrecognized task: '{task}'."},
                "text":   f"Task not recognized: '{task}'. Supported tasks: 'compare', 'simulate', 'optimize'.",
            }
