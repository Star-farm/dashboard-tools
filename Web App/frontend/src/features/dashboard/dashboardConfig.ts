export const USD_TO_VND = 26300;

export type MetricGroupKey = 'economic' | 'environment';

export const METRIC_GROUPS = {
    economic: {
        left: { key: 'Avg Yield', unit: 't/ha' },
        right: { key: 'Net Income', unit: '$/ha' },
    },
    environment: {
        left: { key: 'Methane Emissions', unit: 'kg/ha' },
        right: { key: 'Emission Intensity', unit: 'kg CH₄/t' },
    },
} as const;

export const SCENARIO_COLORS: Record<string, string> = {
    'Business As Usual': '#ef4444',
    'One Million Hectare Rice': '#22c55e',
    Simulation: '#3b82f6',
};

export const PREDICTION_INTERVAL_COLOR = '#f59e0b';

export const SCENARIO_KEYS = [
    'Business As Usual',
    'One Million Hectare Rice',
    'Simulation',
] as const;

export const SIMULATION_INPUT_LIMITS = {
    fertilizer_usage: { min: 80, max: 145, step: 5 },
    pesticide_usage: { min: 4, max: 7.5, step: 0.5 },
    water_usage: { min: 0, max: 850, step: 25 },
} as const;

export const ALL_METRICS = [
    'Avg Yield',
    'Net Income',
    'Methane Emissions',
    'Emission Intensity',
] as const;

export const KPI_CARDS_CONFIG: {
    key: string;
    unit: string;
    lowerIsBetter?: boolean;
}[] = [
    { key: 'Avg Yield', unit: 't/ha' },
    { key: 'Methane Emissions', unit: 'kg/ha', lowerIsBetter: true },
    { key: 'Net Income', unit: '$/ha' },
    { key: 'Profit Margin', unit: '%' },
];
