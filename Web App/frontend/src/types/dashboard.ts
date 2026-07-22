export interface ScenarioInfo {
    scenario_groups: string[];
    season_types: string[];
    climate_types: string[];
    resource_scenarios: string[];
    awd_options: string[];
}

export interface SummaryMetrics {
    status?: string;
    message?: string;
    total_records: number;
    avg_yield: number;
    avg_methane_emissions: number;
    avg_profit_margin: number;
    avg_net_income: number;
    avg_water_usage: number;
    avg_fertilizer_usage: number;
    avg_pesticide_usage: number;
    avg_salinity_exposure: number;
    awd_comparison?: Record<string, {
        'Avg Yield': number;
        'Methane Emissions': number;
        'Profit Margin': number;
    }>;
}


export interface KpiChangeResult {
    scenario_group: string;
    base_year: number;
    target_year: number;
    kpis: Record<string, {
        base_value: number | null;
        target_value: number | null;
        pct_change: number | null;
    }>;
}


export interface SimulationResult {
    inputs: {
        'AWD Adoption': string;
        'Scenario Group': string;
        'Fertilizer Usage': number;
        'Pesticide Usage': number;
        'Water Usage': number;
    };
    predictions: {
        'Avg Yield': number;
        'Methane Emissions': number;
        'Emission Intensity': number;
        'Profit Margin': number;
        'Net Income': number;
    };
    prediction_intervals?: Partial<Record<keyof SimulationResult['predictions'], {
        lower: number;
        upper: number;
        level: number;
    }>>;
}
