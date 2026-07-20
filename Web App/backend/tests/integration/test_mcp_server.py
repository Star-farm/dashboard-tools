"""Integration tests for simulation data, model cache, and MCP tools."""

import os
import tempfile
import pandas as pd
import pytest
import numpy as np
from unittest.mock import MagicMock, patch

import mcp_server
from mcp_server import (
    validate_csv_schema,
    _dataset_fingerprint,
    _agg_key,
    _score_batch,
    REQUIRED_COLUMNS,
    CATEGORICAL_COLS
)


# ── 1. Original Test Cases from Your System ───────────────────────────────────

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


def test_financial_metrics_bau_and_omrh():
    bau = mcp_server._calculate_financial_metrics(
        scenario_group="Business As Usual", fertilizer_usage=100,
        pesticide_usage=4, water_usage=500, labor_intensity=20, revenue=1000,
    )
    omrh = mcp_server._calculate_financial_metrics(
        scenario_group="OMRH", fertilizer_usage=100,
        pesticide_usage=4, water_usage=500, labor_intensity=20, revenue=1000,
    )
    assert bau["Production Cost"] == pytest.approx((40 + 80 + 32 + 150 + 30) * 1.1599)
    assert omrh["Production Cost"] == pytest.approx((40 + 80 + 32 + 150 + 210) * 1.1044)
    assert bau["Net Income"] == pytest.approx(1000 - bau["Production Cost"])
    assert bau["Profit Margin"] == pytest.approx(bau["Net Income"] / 1000 * 100)


@pytest.mark.parametrize("revenue", [0.0, -10.0, np.nan])
def test_financial_metrics_handles_non_positive_or_nan_revenue(revenue):
    result = mcp_server._calculate_financial_metrics(
        scenario_group="BAU", fertilizer_usage=-1, pesticide_usage=-1,
        water_usage=-1, labor_intensity=-1, revenue=revenue,
    )
    assert all(np.isfinite(value) for value in result.values())
    assert result["Production Cost"] == pytest.approx(30 * 1.1599)


def test_validate_csv_schema_valid():
    # Initialize minimal valid DataFrame
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
    assert "Revenue" not in REQUIRED_COLUMNS


def test_validate_csv_schema_invalid():
    # Case: Missing columns
    df = pd.DataFrame({"AWD Adoption": ["With AWD"] * 10})
    valid, errors = validate_csv_schema(df)
    assert valid is False
    assert any("Missing" in err for err in errors)

    # Case: Invalid AWD Adoption column values
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

    # Case: Too few rows
    df_too_few = pd.DataFrame(data_dict).head(5)
    valid, errors = validate_csv_schema(df_too_few)
    assert valid is False
    assert any("at least" in err for err in errors)


def test_mcp_tools_with_loaded_data():
    # Ensure global data has been loaded automatically
    assert mcp_server.data is not None
    assert mcp_server.data["Revenue"].equals(
        mcp_server.data["Net Income"] + mcp_server.data["Production Cost"]
    )
    
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
    combos = [("With AWD", "Business As Usual", 120.0, 4.0, 600.0)]
    preds = mcp_server.run_agricultural_simulation(combos)
    assert len(preds) == 1
    assert "Avg Yield" in preds[0]
    assert "Methane Emissions" in preds[0]
    assert "Revenue" not in preds[0]
    for key in ["Production Cost", "Net Income", "Profit Margin", "Emission Intensity"]:
        assert key in preds[0]
        assert isinstance(preds[0][key], float)
    assert preds[0]["Emission Intensity"] == pytest.approx(
        preds[0]["Methane Emissions"] / max(1.0, preds[0]["Avg Yield"] * 1000.0)
    )

    # 5. get_kpi_change
    kpi = mcp_server.get_kpi_change(
        metrics=["Avg Yield", "Methane Emissions"],
        scenario_group="Business As Usual",
        target_year=2050
    )
    assert kpi["scenario_group"] == "Business As Usual"
    assert kpi["base_year"] == 2022
    assert kpi["kpis"]["Avg Yield"]["pct_change"] is not None
    assert "Avg Yield" in kpi["kpis"]


# ── 2. New Test Cases Adjusted for Local VPS Cache ───────────────────────────

def test_require_data_raises_value_error():
    original_data = mcp_server.data
    mcp_server.data = None
    try:
        with pytest.raises(ValueError, match="No agricultural simulation data is currently loaded"):
            mcp_server._require_data()
    finally:
        mcp_server.data = original_data


def test_get_aggregated_metrics_empty():
    res = mcp_server.get_aggregated_metrics(filters={"Scenario Group": "NonExistentGroup"})
    assert res["status"] == "empty"
    assert "No data matches" in res["message"]


def test_validate_csv_schema_non_numeric_values():
    data_dict = {}
    for col in REQUIRED_COLUMNS:
        if col in CATEGORICAL_COLS:
            data_dict[col] = ["With AWD"] * 10 if col == "AWD Adoption" else ["Val"] * 10
        else:
            data_dict[col] = [1.0] * 10
    
    # Overwrite with an invalid value in the dictionary before constructing the DataFrame.
    # This ensures the "Avg Yield" column is initialized as an 'object' (mixed) type,
    # accurately simulating how pd.read_csv handles a corrupted CSV file.
    data_dict["Avg Yield"] = ["invalid_value"] + [1.0] * 9
    
    df = pd.DataFrame(data_dict)
    
    valid, errors = validate_csv_schema(df)
    assert valid is False
    assert any("contains" in err and "non-numeric" in err for err in errors)


def test_validate_csv_schema_empty_categorical():
    data_dict = {}
    for col in REQUIRED_COLUMNS:
        if col in CATEGORICAL_COLS:
            data_dict[col] = ["With AWD"] * 10 if col == "AWD Adoption" else ["Val"] * 10
        else:
            data_dict[col] = [1.0] * 10
    
    df = pd.DataFrame(data_dict)
    df["Climate Type"] = ["   "] * 10
    
    valid, errors = validate_csv_schema(df)
    assert valid is False
    assert any("does not contain any valid entries" in err for err in errors)


def test_load_simulation_csv_not_found():
    res = mcp_server.load_simulation_csv("non_existent_file.csv")
    assert res["status"] == "error"
    assert "not found" in res["message"]


@patch("mcp_server.joblib.load")
def test_load_and_train_local_cache_corrupted(mock_load):
    # Simulate cache file loading throwing an exception due to corrupted content
    mock_load.side_effect = Exception("Corrupt file content")
    
    with tempfile.TemporaryDirectory() as tmpdir:
        # Temporarily redirect the server's MODEL_CACHE_DIR to a temporary directory
        with patch("mcp_server.MODEL_CACHE_DIR", tmpdir):
            
            # Create a realistic dummy cache file so that os.path.exists naturally returns True
            cache_file_path = os.path.join(
                tmpdir, f"{mcp_server.MODEL_CACHE_VERSION}_dummy_key.joblib"
            )
            with open(cache_file_path, "w") as f:
                f.write("corrupt_binary_data")
            
            # Prepare valid input data to train the fallback model
            data_dict = {}
            for col in REQUIRED_COLUMNS:
                if col in CATEGORICAL_COLS:
                    data_dict[col] = ["With AWD"] * 11 if col == "AWD Adoption" else ["Val"] * 11
                else:
                    data_dict[col] = [100.0] * 11
            df = pd.DataFrame(data_dict)
            
            result = mcp_server._load_and_train(df, cache_key="dummy_key")
            assert result["status"] == "success"
            assert result["from_cache"] is None


def test_load_and_train_insufficient_rows():
    data_dict = {}
    for col in REQUIRED_COLUMNS:
        if col in CATEGORICAL_COLS:
            data_dict[col] = ["With AWD"] * 5 if col == "AWD Adoption" else ["Val"] * 5
        else:
            data_dict[col] = [1.0] * 5
    df = pd.DataFrame(data_dict)
    
    result = mcp_server._load_and_train(df)
    assert result["status"] == "error"
    assert "insufficient row data" in result["message"]


def test_get_scenarios_without_optional_columns():
    original_data = mcp_server.data
    if original_data is not None and "Scenario Name" in original_data.columns:
        mcp_server.data = original_data.drop(columns=["Scenario Name"])
    
    try:
        scenarios = mcp_server.get_scenarios()
        assert "scenario_names" not in scenarios
    finally:
        mcp_server.data = original_data


def test_get_kpi_change_missing_datetime_column():
    original_data = mcp_server.data
    if original_data is not None and "datetime" in original_data.columns:
        mcp_server.data = original_data.drop(columns=["datetime"])
    
    try:
        with pytest.raises(ValueError, match="missing the required 'datetime' column"):
            mcp_server.get_kpi_change(metrics=["Avg Yield"])
    finally:
        mcp_server.data = original_data


# ── 3. Add Fixture to Clean Up Global State ───────────────────────────────────

@pytest.fixture(autouse=True)
def restore_global_state_after_test():
    # Save the original state of mcp_server before running each test case
    orig_data = mcp_server.data.copy() if mcp_server.data is not None else None
    orig_models = mcp_server.models.copy() if mcp_server.models is not None else {}
    orig_encoders = mcp_server.label_encoders.copy() if mcp_server.label_encoders is not None else {}
    
    yield  # Execute test case
    
    # Restore the original state after the test case finishes
    mcp_server.data = orig_data
    mcp_server.models = orig_models
    mcp_server.label_encoders = orig_encoders


# ── 4. Update KPI Test Case to Initialize Data Independently ──────────────────

def test_get_kpi_change_non_existent_metric():
    original_data = mcp_server.data
    
    # Create independent dummy data containing a datetime column specifically for this test
    dummy_df = pd.DataFrame({
        "datetime": pd.to_datetime(["2024-01-01", "2050-01-01"]),
        "Scenario Group": ["Business As Usual", "Business As Usual"]
    })
    mcp_server.data = dummy_df
    
    try:
        res = mcp_server.get_kpi_change(
            metrics=["Invalid Metric Column"],
            scenario_group="Business As Usual",
            base_year=2024,
            target_year=2050
        )
        assert "error" in res["kpis"]["Invalid Metric Column"]
    finally:
        mcp_server.data = original_data


def test_finite_float_and_gcs_disabled_helpers():
    assert mcp_server._finite_float("bad", 7) == 7.0
    assert mcp_server._finite_float(float("inf"), 8) == 8.0
    assert mcp_server._gcs_blob_name("abc").endswith("_abc.joblib")
    with patch("mcp_server.GCS_CACHE_BUCKET", ""):
        assert mcp_server._try_download_cache_from_gcs("abc", "unused") is False
        assert mcp_server._try_upload_cache_to_gcs("abc", "unused") is None


def test_gcs_helpers_success_and_nonfatal_failure():
    blob = MagicMock()
    blob.exists.return_value = True
    blob.download_to_filename.side_effect = lambda path: open(path, "wb").write(b"cache")
    bucket = MagicMock()
    bucket.blob.return_value = blob
    client = MagicMock()
    client.bucket.return_value = bucket
    storage_module = MagicMock()
    storage_module.Client.return_value = client
    with tempfile.TemporaryDirectory() as temp_dir:
        target = os.path.join(temp_dir, "nested", "cache.joblib")

        with patch("mcp_server.GCS_CACHE_BUCKET", "bucket"), \
             patch.dict("sys.modules", {"google.cloud.storage": storage_module}):
            assert mcp_server._try_download_cache_from_gcs("key", target) is True
            downloaded_path = blob.download_to_filename.call_args.args[0]
            assert downloaded_path.endswith(".download")
            assert os.path.exists(target)
            assert not os.path.exists(downloaded_path)
            mcp_server._try_upload_cache_to_gcs("key", target)
            blob.upload_from_filename.assert_called_once_with(target)

        storage_module.Client.side_effect = RuntimeError("gcs unavailable")
        with patch("mcp_server.GCS_CACHE_BUCKET", "bucket"), \
             patch.dict("sys.modules", {"google.cloud.storage": storage_module}):
            assert mcp_server._try_download_cache_from_gcs("key", target) is False
            assert mcp_server._try_upload_cache_to_gcs("key", target) is None


def test_load_csv_read_and_schema_failures():
    with tempfile.TemporaryDirectory() as temp_dir:
        path = os.path.join(temp_dir, "input.csv")
        with open(path, "w", encoding="utf-8") as handle:
            handle.write("broken")
        with patch("mcp_server.pd.read_csv", side_effect=ValueError("bad csv")):
            result = mcp_server.load_simulation_csv(path)
            assert result["status"] == "error"
            assert "Failed to read" in result["message"]
        with patch("mcp_server.pd.read_csv", return_value=pd.DataFrame({"wrong": [1]})):
            result = mcp_server.load_simulation_csv(path)
            assert result["status"] == "invalid_template"
            assert result["errors"]


def test_simulation_falls_back_for_unknown_encoder_values():
    original = mcp_server.label_encoders
    mcp_server.label_encoders = {}
    try:
        result = mcp_server.run_agricultural_simulation([
            ("With AWD", "Unknown Scenario", 100.0, 5.0, 600.0)
        ])
        assert len(result) == 1
        assert "Avg Yield" in result[0]
    finally:
        mcp_server.label_encoders = original
