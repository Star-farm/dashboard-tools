import os
import tempfile
import pandas as pd
import pytest
import numpy as np

import mcp_server
from mcp_server import (
    validate_csv_schema,
    _dataset_fingerprint,
    _agg_key,
    _score_batch,
    REQUIRED_COLUMNS,
    CATEGORICAL_COLS
)

def test_dataset_fingerprint():
    with tempfile.NamedTemporaryFile(delete=False, suffix=".csv", mode="w") as f:
        f.write("hello,world\n1,2\n")
        temp_path = f.name
    try:
        fingerprint = _dataset_fingerprint(temp_path)
        assert len(fingerprint) == 12
        assert isinstance(fingerprint, str)
    finally:
        os.remove(temp_path)

def test_agg_key():
    assert _agg_key("Avg Yield") == "avg_yield"
    assert _agg_key("Methane Emissions") == "avg_methane_emissions"
    assert _agg_key("avg_profit") == "avg_profit"
    assert _agg_key("net income") == "avg_net_income"

def test_score_batch():
    preds = [
        {"Avg Yield": 5.0, "Profit Margin": 40.0, "Methane Emissions": 150.0},
        {"Avg Yield": 4.5, "Profit Margin": 35.0, "Methane Emissions": 250.0},
    ]
    scores = _score_batch(preds, target_methane=200.0)
    # Score 1: 5.0 * 2.0 + 40.0 - max(150 - 200, 0)*10 = 50.0 - 0 = 50.0
    # Score 2: 4.5 * 2.0 + 35.0 - max(250 - 200, 0)*10 = 44.0 - 50*10 = -456.0
    assert len(scores) == 2
    assert scores[0] == 50.0
    assert scores[1] == -456.0

def test_validate_csv_schema_valid():
    # Build a minimal valid dataframe
    data_dict = {}
    for col in REQUIRED_COLUMNS:
        if col in CATEGORICAL_COLS:
            if col == "AWD Adoption":
                data_dict[col] = ["With AWD"] * 10
            elif col == "Scenario Group":
                data_dict[col] = ["Business As Usual"] * 10
            else:
                data_dict[col] = ["TestVal"] * 10
        else:
            data_dict[col] = [100.0] * 10
    
    df = pd.DataFrame(data_dict)
    valid, errors = validate_csv_schema(df)
    assert valid is True
    assert len(errors) == 0

def test_validate_csv_schema_invalid():
    # Missing columns
    df = pd.DataFrame({"AWD Adoption": ["With AWD"] * 10})
    valid, errors = validate_csv_schema(df)
    assert valid is False
    assert any("Missing" in err for err in errors)

    # Invalid AWD Adoption values
    data_dict = {}
    for col in REQUIRED_COLUMNS:
        if col in CATEGORICAL_COLS:
            if col == "AWD Adoption":
                data_dict[col] = ["Invalid AWD"] * 10
            elif col == "Scenario Group":
                data_dict[col] = ["Business As Usual"] * 10
            else:
                data_dict[col] = ["TestVal"] * 10
        else:
            data_dict[col] = [100.0] * 10
    df_invalid_awd = pd.DataFrame(data_dict)
    valid, errors = validate_csv_schema(df_invalid_awd)
    assert valid is False
    assert any("AWD Adoption" in err and "invalid" in err.lower() for err in errors)

    # Too few rows
    df_too_few = pd.DataFrame(data_dict).head(5)
    valid, errors = validate_csv_schema(df_too_few)
    assert valid is False
    assert any("at least" in err for err in errors)

def test_mcp_tools_with_loaded_data():
    # Verify the global state is loaded automatically since DEFAULT_CSV_PATH is set
    assert mcp_server.data is not None
    
    # 1. get_data_status
    status = mcp_server.get_data_status()
    assert status["data_loaded"] is True
    assert status["rows_loaded"] > 0
    assert status["models_ready"] is True
    
    # 2. get_scenarios
    scenarios = mcp_server.get_scenarios()
    assert "scenario_groups" in scenarios
    assert "awd_options" in scenarios
    
    # 3. get_aggregated_metrics
    agg = mcp_server.get_aggregated_metrics(filters={"AWD Adoption": "With AWD"})
    assert "total_records" in agg
    assert "avg_yield" in agg
    
    # 4. run_agricultural_simulation
    # combo format: (awd_str, scenario_group_str, fert, pest, water)
    combos = [("With AWD", "Business As Usual", 120.0, 4.0, 600.0)]
    preds = mcp_server.run_agricultural_simulation(combos)
    assert len(preds) == 1
    assert "Avg Yield" in preds[0]
    assert "Methane Emissions" in preds[0]

    # 5. get_kpi_change
    kpi = mcp_server.get_kpi_change(
        metrics=["Avg Yield", "Methane Emissions"],
        scenario_group="Business As Usual",
        base_year=2024,
        target_year=2050
    )
    assert kpi["scenario_group"] == "Business As Usual"
    assert "Avg Yield" in kpi["kpis"]
