"""Shared model schema and versioning used by training and serving."""

MODEL_CACHE_VERSION = "v13_model_bundle"
DEFAULT_SIMULATION_YEAR = 2050
AVERAGED_DIMENSIONS = ["Resource Scenario", "Season Type", "Climate Type"]
SIMULATION_INPUT_LIMITS = {
    "Fertilizer Usage": (80.0, 145.0),
    "Pesticide Usage": (4.0, 7.5),
    "Water Usage": (0.0, 850.0),
}

INPUT_FEATURES = [
    "AWD Adoption", "Scenario Group", "Year", "Resource Scenario",
    "Season Type", "Climate Type", "Fertilizer Usage",
    "Pesticide Usage", "Water Usage",
]
PREDICTION_TARGETS = [
    "Avg Yield", "Methane Emissions", "Revenue", "Production Cost",
]
AGG_NUMERIC_COLS = [
    "Avg Yield", "Methane Emissions", "Emission Intensity", "Profit Margin",
    "Net Income", "Production Cost", "Straw Value", "Water Usage",
    "Fertilizer Usage", "Pesticide Usage", "Salinity Exposure",
    "Max Flood Continuous", "Flood Stress", "Drought Stress",
    "Salinity Stress", "Biodiversity", "Resilient Varieties",
    "Water Reliability", "Labor Intensity",
]
CATEGORICAL_COLS = [
    "AWD Adoption", "Scenario Group", "Season Type", "Climate Type",
    "Resource Scenario", "Scenario Name",
]
REQUIRED_COLUMNS = sorted(set(
    CATEGORICAL_COLS
    + [feature for feature in INPUT_FEATURES if feature != "Year"]
    + ["datetime"]
    + [target for target in PREDICTION_TARGETS if target != "Revenue"]
    + AGG_NUMERIC_COLS
))
MIN_ROWS_PER_TARGET = 10
