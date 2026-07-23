import { API_BASE } from '../config/api';
import type { KpiChangeResult, SimulationResult } from '../types/dashboard';
import { ALL_METRICS } from '../features/dashboard/dashboardConfig';

export interface SimulationInputs {
    awd_adoption: string;
    fertilizer_usage: number;
    pesticide_usage: number;
    water_usage: number;
}

export type ScenarioGroup = 'Business As Usual' | 'One Million Hectare Rice';
export type ScenarioMetrics = Record<string, Record<string, number>>;

interface ComparisonResponse {
    result?: { compare_breakdown?: ScenarioMetrics };
}

async function apiFetchJson<T>(path: string, options: RequestInit = {}): Promise<T> {
    const response = await fetch(`${API_BASE}${path}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...options.headers,
        },
    });

    if (response.status === 401 || response.status === 502) {
        console.error(`[dashboardApi] ${response.status} on ${path} — check the proxy configuration.`);
    }
    if (!response.ok) {
        throw new Error(`${path} request failed with status ${response.status}`);
    }

    return response.json() as Promise<T>;
}

export function fetchKpiChange(signal?: AbortSignal): Promise<KpiChangeResult> {
    return apiFetchJson('/kpi-change', {
        method: 'POST',
        body: JSON.stringify({}),
        signal,
    });
}

export async function fetchComparison(signal?: AbortSignal): Promise<ScenarioMetrics> {
    const response = await apiFetchJson<ComparisonResponse>('/compare', {
        method: 'POST',
        body: JSON.stringify({
            metrics: ALL_METRICS,
            dimension: 'Scenario Group',
            filters: { Year: '2050' },
        }),
        signal,
    });
    return response.result?.compare_breakdown ?? {};
}

export function fetchSimulation(
    inputs: SimulationInputs,
    scenarioGroup: ScenarioGroup,
    signal?: AbortSignal,
): Promise<SimulationResult> {
    return apiFetchJson('/simulate', {
        method: 'POST',
        body: JSON.stringify({ ...inputs, scenario_group: scenarioGroup }),
        signal,
    });
}
