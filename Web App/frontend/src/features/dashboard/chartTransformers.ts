import type { Translation } from '../../i18n';
import type { SimulationResult } from '../../types/dashboard';
import type { ScenarioMetrics } from '../../api/dashboardApi';
import {
    METRIC_GROUPS,
    SCENARIO_KEYS,
    USD_TO_VND,
    type MetricGroupKey,
} from './dashboardConfig';

export interface IndicatorChart {
    data: Record<string, unknown>[];
    left: { key: string; unit: string };
    right: { key: string; unit: string };
    leftDomain: [number, number];
    leftTicks: number[];
    rightDomain: [number, number];
    rightTicks: number[];
}

function niceStep(rawStep: number): number {
    if (rawStep <= 0) return 1;
    const exponent = Math.floor(Math.log10(rawStep));
    const base = 10 ** exponent;
    const normalized = rawStep / base;
    const niceNormalized = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
    return niceNormalized * base;
}

export function computeDomainAndTicks(
    data: Record<string, unknown>[],
    keys: string[],
): { domain: [number, number]; ticks: number[] } {
    let minValue = 0;
    let maxValue = 0;

    data.forEach((item) => {
        keys.forEach((key) => {
            const value = item[key];
            if (value == null) return;
            const numericValue = Number(value);
            if (Number.isFinite(numericValue)) {
                minValue = Math.min(minValue, numericValue);
                maxValue = Math.max(maxValue, numericValue);
            }
        });
    });

    if (maxValue === 0 && minValue === 0) {
        return { domain: [0, 5], ticks: [0, 1, 2, 3, 4, 5] };
    }

    const step = niceStep(Math.max(maxValue, -minValue) / 5);
    const domain: [number, number] = [
        minValue < 0 ? Math.floor(minValue / step) * step : 0,
        Math.ceil(maxValue / step) * step,
    ];
    const ticks: number[] = [];
    for (let tick = domain[0]; tick <= domain[1] + 1e-9; tick += step) {
        ticks.push(Math.round(tick * 100) / 100);
    }
    return { domain, ticks };
}

export function buildIndicatorChart(
    group: MetricGroupKey,
    scenarioMetrics: ScenarioMetrics,
    simulation: SimulationResult | null,
    language: 'vi' | 'en',
    t: Translation,
): IndicatorChart {
    const { left: rawLeft, right: rawRight } = METRIC_GROUPS[group];
    const isVnd = language === 'vi' && rawRight.key === 'Net Income';
    const localizedUnits: Record<string, string> = {
        'Avg Yield': t.yieldUnit,
        'Net Income': isVnd ? t.netIncomeVndUnit : t.netIncomeUsdUnit,
        'Methane Emissions': t.methanePerHectareUnit,
        'Emission Intensity': t.emissionIntensityUnit,
    };
    const left = { ...rawLeft, unit: localizedUnits[rawLeft.key] };
    const right = { ...rawRight, unit: localizedUnits[rawRight.key] };
    const convertRight = (value: number) => isVnd
        ? Number((value * USD_TO_VND / 1_000_000).toFixed(1))
        : Number(value.toFixed(2));

    const leftRow: Record<string, unknown> = { indicator: left.key };
    const rightRow: Record<string, unknown> = { indicator: right.key };
    SCENARIO_KEYS.forEach((scenario) => {
        leftRow[`${scenario}_left`] = null;
        leftRow[`${scenario}_right`] = null;
        rightRow[`${scenario}_left`] = null;
        rightRow[`${scenario}_right`] = null;
    });

    (['Business As Usual', 'One Million Hectare Rice'] as const).forEach((scenario) => {
        const values = scenarioMetrics[scenario];
        if (!values) return;
        leftRow[`${scenario}_left`] = Number(Number(values[left.key] ?? 0).toFixed(2));
        rightRow[`${scenario}_right`] = convertRight(Number(values[right.key] ?? 0));
    });

    if (simulation?.predictions) {
        const leftKey = left.key as keyof SimulationResult['predictions'];
        const rightKey = right.key as keyof SimulationResult['predictions'];
        const leftPrediction = Number(simulation.predictions[leftKey] ?? 0);
        const rightPrediction = Number(simulation.predictions[rightKey] ?? 0);
        leftRow.Simulation_left = Number(leftPrediction.toFixed(2));
        rightRow.Simulation_right = convertRight(rightPrediction);

        const leftInterval = simulation.prediction_intervals?.[leftKey];
        if (leftInterval) {
            leftRow.Simulation_left_lower = Number(leftInterval.lower.toFixed(2));
            leftRow.Simulation_left_upper = Number(leftInterval.upper.toFixed(2));
            leftRow.Simulation_left_level = leftInterval.level;
            leftRow.Simulation_left_error = [
                Math.max(0, leftPrediction - leftInterval.lower),
                Math.max(0, leftInterval.upper - leftPrediction),
            ];
        }

        const rightInterval = simulation.prediction_intervals?.[rightKey];
        if (rightInterval) {
            const lower = convertRight(rightInterval.lower);
            const upper = convertRight(rightInterval.upper);
            const displayedPrediction = convertRight(rightPrediction);
            rightRow.Simulation_right_lower = lower;
            rightRow.Simulation_right_upper = upper;
            rightRow.Simulation_right_level = rightInterval.level;
            rightRow.Simulation_right_error = [
                Math.max(0, displayedPrediction - lower),
                Math.max(0, upper - displayedPrediction),
            ];
        }
    }

    const data = [leftRow, rightRow];
    const leftScale = computeDomainAndTicks(data, [
        ...SCENARIO_KEYS.map((scenario) => `${scenario}_left`),
        'Simulation_left_lower',
        'Simulation_left_upper',
    ]);
    const rightScale = computeDomainAndTicks(data, [
        ...SCENARIO_KEYS.map((scenario) => `${scenario}_right`),
        'Simulation_right_lower',
        'Simulation_right_upper',
    ]);

    return {
        data,
        left,
        right,
        leftDomain: leftScale.domain,
        leftTicks: leftScale.ticks,
        rightDomain: rightScale.domain,
        rightTicks: rightScale.ticks,
    };
}
