import { useState, useEffect, useMemo, useRef } from 'react';
import type { ScenarioInfo, SimulationResult, KpiChangeResult } from '../types/dashboard';
import { TRANSLATIONS } from '../i18n';
import { API_BASE } from '../config/api';

export const USD_TO_VND = 26300;

export type MetricGroupKey = 'economic' | 'environment';

export const METRIC_GROUPS: Record<MetricGroupKey, {
    left: { key: string; unit: string };
    right: { key: string; unit: string };
}> = {
    economic: {
        left: { key: 'Avg Yield', unit: 't/ha' },
        right: { key: 'Net Income', unit: '$/ha' },
    },
    environment: {
        left: { key: 'Methane Emissions', unit: 'kg/ha' },
        right: { key: 'Emission Intensity', unit: 'kg CH4/t' },
    },
};

// Fixed color by scenario — no longer changing by metric.
export const SCENARIO_COLORS: Record<string, string> = {
    'Business As Usual': '#ef4444',        // red
    'One Million Hectare Rice': '#22c55e', // green
    'Simulation': '#3b82f6',               // blue
};

export const PREDICTION_INTERVAL_COLOR = '#f59e0b'; // amber, distinct from the blue simulation bar

export const SCENARIO_KEYS = ['Business As Usual', 'One Million Hectare Rice', 'Simulation'] as const;

export const SIMULATION_INPUT_LIMITS = {
    fertilizer_usage: { min: 80, max: 145, step: 5 },
    pesticide_usage: { min: 4, max: 7.5, step: 0.5 },
    water_usage: { min: 0, max: 850, step: 25 },
} as const;

const ALL_METRICS = ['Avg Yield', 'Net Income', 'Methane Emissions', 'Emission Intensity'];

export const KPI_CARDS_CONFIG: { key: string; unit: string; lowerIsBetter?: boolean }[] = [
    { key: 'Avg Yield', unit: 't/ha' },
    { key: 'Methane Emissions', unit: 'kg/ha', lowerIsBetter: true },
    { key: 'Net Income', unit: '$/ha' },
    { key: 'Profit Margin', unit: '%' },
];

// ── Centralized API client ──────────────────────────────────────────────────
// Requests go to the same-origin BFF proxy (/api/proxy/*), which attaches
// the real API key server-side before forwarding to Cloud Run. No key is
// ever present in the browser bundle or Network tab anymore.

async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
    const response = await fetch(`${API_BASE}${path}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...(options.headers || {}),
        },
    });

    if (response.status === 401 || response.status === 502) {
        console.error(`[useDashboardData] ${response.status} on ${path} — check the proxy's env vars on Vercel.`);
    }

    return response;
}

const niceStep = (rawStep: number): number => {
    if (rawStep <= 0) return 1;
    const exponent = Math.floor(Math.log10(rawStep));
    const base = Math.pow(10, exponent);
    const normalized = rawStep / base;

    let niceNormalized: number;
    if (normalized <= 1) niceNormalized = 1;
    else if (normalized <= 2) niceNormalized = 2;
    else if (normalized <= 5) niceNormalized = 5;
    else niceNormalized = 10;

    return niceNormalized * base;
};

// Compute domain/ticks based on MULTIPLE dataKeys at the same time (3 scenarios for the same axis).
const computeDomainAndTicksMulti = (
    data: Record<string, unknown>[],
    keys: string[]
): { domain: [number, number]; ticks: number[] } => {
    let minVal = 0;
    let maxVal = 0;
    data.forEach(item => {
        keys.forEach(key => {
            const raw = item[key];
            if (raw === null || raw === undefined) return;
            const val = Number(raw);
            if (!isNaN(val)) {
                minVal = Math.min(minVal, val);
                maxVal = Math.max(maxVal, val);
            }
        });
    });

    if (maxVal === 0 && minVal === 0) {
        return { domain: [0, 5], ticks: [0, 1, 2, 3, 4, 5] };
    }

    const step = niceStep(Math.max(maxVal, -minVal) / 5);
    const domainMax = Math.ceil(maxVal / step) * step;
    const domainMin = minVal < 0 ? Math.floor(minVal / step) * step : 0;

    const ticks: number[] = [];
    for (let tick = domainMin; tick <= domainMax + 1e-9; tick += step) {
        ticks.push(Math.round(tick * 100) / 100);
    }

    return { domain: [domainMin, domainMax], ticks };
};

export function useDashboardData(lang: 'vi' | 'en') {
    const t = TRANSLATIONS[lang];

    const [scenariosInfo, setScenariosInfo] = useState<ScenarioInfo | null>(null);
    const [isInitialLoading, setIsInitialLoading] = useState(true);
    const [kpiChange, setKpiChange] = useState<KpiChangeResult | null>(null);
    const [loadingKpi, setLoadingKpi] = useState(false);

    // Raw data from /api/compare: { "Business As Usual": { "Avg Yield": .., "Net Income": .. }, "One Million Hectare Rice": {...} }
    const [scenarioMetricValues, setScenarioMetricValues] = useState<Record<string, Record<string, number>>>({});
    const [loadingBar, setLoadingBar] = useState(false);

    const [simScenarioGroup, setSimScenarioGroup] = useState<'Business As Usual' | 'One Million Hectare Rice'>('Business As Usual');
    const [simInputs, setSimInputs] = useState({
        awd_adoption: 'Without AWD',
        fertilizer_usage: 105,
        pesticide_usage: 6,
        water_usage: 350,
    });
    const [simResults, setSimResults] = useState<SimulationResult | null>(null);
    const [loadingSim, setLoadingSim] = useState(false);

    const [isMobile, setIsMobile] = useState(
        typeof window !== 'undefined' ? window.matchMedia('(max-width: 640px)').matches : false
    );

    const hasLoadedOnce = useRef(false);

    // ── Fetchers ────────────────────────────────────────────────────────────

    const fetchScenarios = async () => {
        try {
            const res = await apiFetch(`/scenarios`);
            const data = await res.json();
            setScenariosInfo(data);
        } catch (e) {
            console.error("Error loading scenarios", e);
        }
    };

    const fetchKpiChange = async () => {
        setLoadingKpi(true);
        try {
            const res = await apiFetch(`/kpi-change`, {
                method: 'POST',
                body: JSON.stringify({}),
            });
            if (!res.ok) {
                console.error("KPI change fetch failed with status", res.status, await res.text());
                setKpiChange(null);
                return;
            }
            const data = await res.json();
            setKpiChange(data);
        } catch (e) {
            console.error("Error loading KPI change", e);
            setKpiChange(null);
        } finally {
            setLoadingKpi(false);
        }
    };

    // Fetch all 4 metrics (2 economic + environmental groups) at once for BAU & OMRH in 2050.
    const fetchBarChartData = async () => {
        setLoadingBar(true);
        try {
            const res = await apiFetch(`/compare`, {
                method: 'POST',
                body: JSON.stringify({
                    metrics: ALL_METRICS,
                    dimension: 'Scenario Group',
                    filters: { Year: '2050' }
                })
            });
            if (!res.ok) throw new Error('compare fetch failed');
            const data = await res.json();

            if (data.result && data.result.compare_breakdown) {
                setScenarioMetricValues(data.result.compare_breakdown as Record<string, Record<string, number>>);
            } else {
                setScenarioMetricValues({});
            }
        } catch (e) {
            console.error("Error loading bar chart data", e);
            setScenarioMetricValues({});
        } finally {
            setLoadingBar(false);
        }
    };

    const runSimulation = async (inputs = simInputs, scenarioGroup = simScenarioGroup) => {
        setLoadingSim(true);
        try {
            const res = await apiFetch(`/simulate`, {
                method: 'POST',
                body: JSON.stringify({ ...inputs, scenario_group: scenarioGroup })
            });
            const data = await res.json();
            setSimResults(data);
        } catch (e) {
            console.error("Error running simulation", e);
        } finally {
            setLoadingSim(false);
        }
    };

    // ── Effects ─────────────────────────────────────────────────────────────

    useEffect(() => {
        const loadInitialData = async () => {
            try {
                await fetchScenarios();
                await fetchKpiChange();
                await runSimulation();
                await fetchBarChartData();
            } catch (e) {
                console.error("Error performing coordinated dashboard load", e);
            } finally {
                setIsInitialLoading(false);
                hasLoadedOnce.current = true;
            }
        };
        loadInitialData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        const mq = window.matchMedia('(max-width: 640px)');
        const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
        mq.addEventListener('change', handler);
        return () => mq.removeEventListener('change', handler);
    }, []);

    // ── Build data for 1 chart (economic | environment), grouped by Indicator ──

    const buildIndicatorChart = (group: MetricGroupKey) => {
        const { left, right: rawRight } = METRIC_GROUPS[group];
        const isVnd = lang === 'vi' && rawRight.key === 'Net Income';
        const right = isVnd ? { ...rawRight, unit: 'triệu VNĐ/ha' } : rawRight;

        const convertRight = (val: number) =>
            isVnd
                ? Number((val * USD_TO_VND / 1000000).toFixed(1))
                : parseFloat(val.toFixed(2));

        const leftRow: Record<string, unknown> = { indicator: left.key };
        const rightRow: Record<string, unknown> = { indicator: right.key };

        SCENARIO_KEYS.forEach(s => {
            leftRow[`${s}_left`] = null;
            leftRow[`${s}_right`] = null;
            rightRow[`${s}_left`] = null;
            rightRow[`${s}_right`] = null;
        });

        (['Business As Usual', 'One Million Hectare Rice'] as const).forEach(scenario => {
            const vals = scenarioMetricValues[scenario];
            if (vals) {
                leftRow[`${scenario}_left`] = parseFloat(Number(vals[left.key] ?? 0).toFixed(2));
                rightRow[`${scenario}_right`] = convertRight(Number(vals[right.key] ?? 0));
            }
        });
        if (simResults && simResults.predictions) {
            const leftPrediction = Number(simResults.predictions[left.key as keyof typeof simResults.predictions] ?? 0);
            const rightPrediction = Number(simResults.predictions[right.key as keyof typeof simResults.predictions] ?? 0);
            leftRow['Simulation_left'] = parseFloat(leftPrediction.toFixed(2));
            rightRow['Simulation_right'] = convertRight(rightPrediction);

            const leftInterval = simResults.prediction_intervals?.[left.key as keyof typeof simResults.predictions];
            if (leftInterval) {
                const lower = parseFloat(leftInterval.lower.toFixed(2));
                const upper = parseFloat(leftInterval.upper.toFixed(2));
                leftRow['Simulation_left_lower'] = lower;
                leftRow['Simulation_left_upper'] = upper;
                leftRow['Simulation_left_level'] = leftInterval.level;
                leftRow['Simulation_left_error'] = [
                    Math.max(0, leftPrediction - leftInterval.lower),
                    Math.max(0, leftInterval.upper - leftPrediction),
                ];
            }

            const rightInterval = simResults.prediction_intervals?.[right.key as keyof typeof simResults.predictions];
            if (rightInterval) {
                const lower = convertRight(rightInterval.lower);
                const upper = convertRight(rightInterval.upper);
                const displayedPrediction = convertRight(rightPrediction);
                rightRow['Simulation_right_lower'] = lower;
                rightRow['Simulation_right_upper'] = upper;
                rightRow['Simulation_right_level'] = rightInterval.level;
                rightRow['Simulation_right_error'] = [
                    Math.max(0, displayedPrediction - lower),
                    Math.max(0, upper - displayedPrediction),
                ];
            }
        }
        const data = [leftRow, rightRow];

        const { domain: leftDomain, ticks: leftTicks } = computeDomainAndTicksMulti(
            data,
            [...SCENARIO_KEYS.map(s => `${s}_left`), 'Simulation_left_lower', 'Simulation_left_upper']
        );
        const { domain: rightDomain, ticks: rightTicks } = computeDomainAndTicksMulti(
            data,
            [...SCENARIO_KEYS.map(s => `${s}_right`), 'Simulation_right_lower', 'Simulation_right_upper']
        );

        return { data, left, right, leftDomain, leftTicks, rightDomain, rightTicks };
    };

    const economicChart = useMemo(
        () => buildIndicatorChart('economic'),
        [scenarioMetricValues, simResults, simScenarioGroup, lang]
    );
    const environmentChart = useMemo(
        () => buildIndicatorChart('environment'),
        [scenarioMetricValues, simResults, simScenarioGroup, lang]
    );

    const isVndNetIncome = lang === 'vi';

    const KPI_CARDS = KPI_CARDS_CONFIG.map(cfg => ({
        ...cfg,
        label: cfg.key === 'Avg Yield' ? t.avgYield
            : cfg.key === 'Methane Emissions' ? t.methaneEmissions
                : cfg.key === 'Net Income' ? t.netIncome
                    : t.profitMargin,
    }));

    const keyMessage = useMemo((): string => {
        if (!kpiChange?.kpis) return '';

        const yieldChange = kpiChange.kpis['Avg Yield']?.pct_change;
        const methaneChange = kpiChange.kpis['Methane Emissions']?.pct_change;
        const incomeChange = kpiChange.kpis['Net Income']?.pct_change;
        const profitChange = kpiChange.kpis['Profit Margin']?.pct_change;

        if (yieldChange == null && methaneChange == null && incomeChange == null && profitChange == null) {
            return '';
        }

        const parts: string[] = [];

        if (methaneChange != null && methaneChange > 0) {
            parts.push(
                lang === 'vi'
                    ? `phát thải khí methane có thể tăng ${methaneChange.toFixed(1)}%`
                    : `methane emissions could rise by ${methaneChange.toFixed(1)}%`
            );
        }
        if (yieldChange != null && yieldChange < 0) {
            parts.push(
                lang === 'vi'
                    ? `năng suất trung bình giảm ${Math.abs(yieldChange).toFixed(1)}%`
                    : `average yield could drop ${Math.abs(yieldChange).toFixed(1)}%`
            );
        }
        if (incomeChange != null && incomeChange < 0) {
            parts.push(
                lang === 'vi'
                    ? `thu nhập ròng giảm ${Math.abs(incomeChange).toFixed(1)}%`
                    : `net income could fall ${Math.abs(incomeChange).toFixed(1)}%`
            );
        }
        if (profitChange != null && profitChange < 0) {
            parts.push(
                lang === 'vi'
                    ? `biên lợi nhuận giảm ${Math.abs(profitChange).toFixed(1)}%`
                    : `profit margin could shrink ${Math.abs(profitChange).toFixed(1)}%`
            );
        }

        if (parts.length === 0) return '';

        const joined = parts.join(', ');

        return lang === 'vi'
            ? `Nếu tiếp tục canh tác theo phương pháp hiện tại (Canh tác như thường lệ), đến năm 2050 ${joined} so với năm 2022.`
            : `If current farming practices (Business As Usual) continue unchanged, by 2050 ${joined} compared to 2022.`;
    }, [kpiChange, lang]);

    return {
        t,
        isInitialLoading,
        scenariosInfo,
        kpiChange, loadingKpi,
        loadingBar,
        simScenarioGroup, setSimScenarioGroup, simInputs, setSimInputs, simResults, loadingSim,
        isMobile,
        isVndNetIncome,
        economicChart,
        environmentChart,
        KPI_CARDS,
        keyMessage,
        runSimulation,
    };
}
