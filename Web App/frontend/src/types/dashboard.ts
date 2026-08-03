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
        'Labor Intensity': number;
        'Profit Margin': number;
        'Net Income': number;
    };
}
