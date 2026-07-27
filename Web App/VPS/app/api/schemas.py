"""Validated request contracts shared by all REST endpoints."""

from typing import Any, Literal
from pydantic import BaseModel, Field, field_validator

VALID_DIMENSIONS = {"Climate Type", "Season Type", "Scenario Group", "Scenario Name", "AWD Adoption", "Resource Scenario", "Year"}
VALID_METRICS = {"Avg Yield", "Methane Emissions", "Emission Intensity", "Profit Margin", "Net Income", "Production Cost", "Straw Value", "Water Usage", "Fertilizer Usage", "Pesticide Usage", "Salinity Exposure", "Max Flood Continuous", "Flood Stress", "Drought Stress", "Salinity Stress", "Biodiversity", "Resilient Varieties", "Water Reliability", "Labor Intensity"}
ScenarioGroup = Literal["Business As Usual", "One Million Hectare Rice"]
AwdAdoption = Literal["With AWD", "Without AWD"]

def _validate_metrics(metrics: list[str]) -> list[str]:
    invalid = [metric for metric in metrics if metric not in VALID_METRICS]
    if invalid:
        raise ValueError(f"Unknown metric(s): {invalid}. Valid options: {sorted(VALID_METRICS)}")
    return metrics

class CompareRequest(BaseModel):
    metrics: list[str] = Field(default_factory=list)
    dimension: str
    filters: dict[str, Any] = Field(default_factory=dict)
    @field_validator("dimension")
    @classmethod
    def validate_dimension(cls, value: str) -> str:
        if value not in VALID_DIMENSIONS:
            raise ValueError(f"Invalid dimension. Valid options: {sorted(VALID_DIMENSIONS)}")
        return value
    @field_validator("metrics")
    @classmethod
    def validate_metrics(cls, value: list[str]) -> list[str]:
        return _validate_metrics(value) if value else value

class SimulationRequest(BaseModel):
    scenario_group: ScenarioGroup = "Business As Usual"
    awd_adoption: AwdAdoption
    fertilizer_usage: float = Field(ge=80.0, le=145.0)
    pesticide_usage: float = Field(ge=4.0, le=7.5)
    water_usage: float = Field(ge=0.0, le=850.0)

class KpiChangeRequest(BaseModel):
    metrics: list[str] = Field(default_factory=lambda: ["Avg Yield", "Methane Emissions", "Net Income", "Profit Margin"])
    @field_validator("metrics")
    @classmethod
    def validate_metrics(cls, value: list[str]) -> list[str]:
        return _validate_metrics(value)
