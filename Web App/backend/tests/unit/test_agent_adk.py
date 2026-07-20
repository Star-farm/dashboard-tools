"""Unit tests for agent classification and formatting behavior."""

from agent_adk import (
    _fmt_val,
    _classify,
    TaskType,
    AggregationAgent,
    ModelingAgent,
    AgentOrchestrator
)

def test_fmt_val():
    assert _fmt_val(123.456, ".2f") == "123.46"
    assert _fmt_val(1000, ",.0f") == "1,000"
    assert _fmt_val("not-a-number", ".2f") == "not-a-number"

def test_classify():
    assert _classify("please simulate crop outcomes") == TaskType.SIMULATE
    assert _classify("optimize fertilizer and water usage") == TaskType.OPTIMIZE
    assert _classify("optimize_resource water") == TaskType.OPTIMIZE_RES
    assert _classify("what is the weather like?") == TaskType.UNKNOWN

def test_aggregation_agent():
    agent = AggregationAgent()
    assert agent.name == "Agricultural Statistics Analyst"
    
    # Test execute
    result = agent.execute(
        task="compare",
        dimension="Climate Type",
        metrics=["Avg Yield", "Methane Emissions"],
        filters={"AWD Adoption": "With AWD"}
    )
    assert "total_records" in result
    assert "compare_dimension" in result
    assert result["compare_dimension"] == "Climate Type"
    assert "compare_breakdown" in result
    
    # Test execute with year filtering (derived column)
    result_year = agent.execute(
        task="compare",
        dimension="Year",
        metrics=["Avg Yield"],
        filters={"Year": "2025"}
    )
    assert "compare_dimension" in result_year
    assert result_year["compare_dimension"] == "Year"

def test_modeling_agent():
    agent = ModelingAgent()
    assert agent.name == "Agricultural Yield & Emission Predictor"

    # Test SIMULATE task
    res_simulate = agent.execute(
        task="simulate",
        awd_adoption="With AWD",
        scenario_group="Business As Usual",
        fertilizer_usage=120.0,
        pesticide_usage=4.0,
        water_usage=600.0
    )
    assert "inputs" in res_simulate
    assert res_simulate["inputs"]["AWD Adoption"] == "With AWD"
    assert "predictions" in res_simulate
    assert "Avg Yield" in res_simulate["predictions"]

    # Test OPTIMIZE task
    res_optimize = agent.execute(
        task="optimize",
        target_methane=400.0,
        pesticide_usage=5.0,
        scenario_group="Business As Usual"
    )
    assert "optimized_inputs" in res_optimize
    assert "expected_outcomes" in res_optimize
    assert res_optimize["best_score"] is not None

    # Test OPTIMIZE_RESOURCE task
    res_opt_res = agent.execute(
        task="optimize_resource",
        resources=["water", "fertilizer"],
        fixed_inputs={"awd_adoption": "With AWD", "scenario_group": "Business As Usual", "pesticide_usage": 5.0},
        target_methane=500.0
    )
    assert "optimized_inputs" in res_opt_res
    assert "expected_outcomes" in res_opt_res

def test_agent_orchestrator():
    orch = AgentOrchestrator()
    
    # Compare query
    res_compare = orch.process_query(
        "compare",
        context={
            "dimension": "Climate Type",
            "metrics": ["Avg Yield"],
            "filters": {"AWD Adoption": "With AWD"}
        }
    )
    assert res_compare["agent"] == orch.agg_agent.name
    assert "result" in res_compare
    assert isinstance(res_compare["text"], str)

    # Simulate query
    res_simulate = orch.process_query(
        "simulate",
        context={
            "awd_adoption": "With AWD",
            "scenario_group": "Business As Usual",
            "fertilizer_usage": 100.0
        }
    )
    assert res_simulate["agent"] == orch.model_agent.name
    assert "predictions" in res_simulate["result"]

    # Optimize query
    res_optimize = orch.process_query(
        "optimize",
        context={
            "target_methane": 300.0
        }
    )
    assert res_optimize["agent"] == orch.model_agent.name
    assert "optimized_inputs" in res_optimize["result"]

    # Unknown task query
    res_unknown = orch.process_query("invalid_task")
    assert "Unrecognized task" in res_unknown["result"]["error"]
