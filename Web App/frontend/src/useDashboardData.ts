import { useState, useEffect, useMemo, useRef } from 'react';
import type { ScenarioInfo, SimulationResult, KpiChangeResult } from './types';
import { TRANSLATIONS } from './translations';
import { API_BASE } from './config';

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

// Màu cố định theo scenario — không còn đổi theo metric nữa.
export const SCENARIO_COLORS: Record<string, string> = {
    'Business As Usual': '#ef4444',        // đỏ
    'One Million Hectare Rice': '#22c55e', // xanh lá
    'Simulation': '#3b82f6',               // xanh dương
};

export const SCENARIO_KEYS = ['Business As Usual', 'One Million Hectare Rice', 'Simulation'] as const;

const ALL_METRICS = ['Avg Yield', 'Net Income', 'Methane Emissions', 'Emission Intensity'];

export const KPI_CARDS_CONFIG: { key: string; unit: string; lowerIsBetter?: boolean }[] = [
    { key: 'Avg Yield', unit: 't/ha' },
    { key: 'Methane Emissions', unit: 'kg/ha', lowerIsBetter: true },
    { key: 'Net Income', unit: '$/ha' },
    { key: 'Profit Margin', unit: '%' },
];

// ── Centralized API client ──────────────────────────────────────────────────
// Every request to the backend must carry X-API-Key now that the server
// enforces API-key auth on all /api/* routes. Route every fetch through this
// helper instead of calling fetch() directly, so the key only has to be
// wired up in one place.

const API_KEY = import.meta.env.VITE_API_KEY as string | undefined;

if (!API_KEY) {
    // Fail loudly in the console rather than silently sending unauthenticated
    // requests that will all come back 401. Check your .env / Vercel env vars.
    console.error(
        '[useDashboardData] VITE_API_KEY is not set. All API requests will fail with 401. ' +
        'Set VITE_API_KEY in your .env (local) or Vercel project environment variables.'
    );
}

async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
    const response = await fetch(`${API_BASE}${path}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            'X-API-Key': API_KEY ?? '',
            ...(options.headers || {}),
        },
    });

    if (response.status === 401) {
        console.error(`[useDashboardData] 401 Unauthorized on ${path} — check VITE_API_KEY.`);
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

// Tính domain/ticks dựa trên NHIỀU dataKey cùng lúc (3 scenario cho cùng 1 trục).
const computeDomainAndTicksMulti = (
    data: Record<string, string | number | null>[],
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

    // Dữ liệu thô từ /api/compare: { "Business As Usual": { "Avg Yield": .., "Net Income": .. }, "One Million Hectare Rice": {...} }
    const [scenarioMetricValues, setScenarioMetricValues] = useState<Record<string, Record<string, number>>>({});
    const [loadingBar, setLoadingBar] = useState(false);

    const [simScenarioGroup, setSimScenarioGroup] = useState<'Business As Usual' | 'One Million Hectare Rice'>('Business As Usual');
    const [simInputs, setSimInputs] = useState({
        awd_adoption: 'With AWD',
        fertilizer_usage: 100,
        pesticide_usage: 5,
        water_usage: 600,
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

    // Lấy 1 lần cả 4 metric (2 nhóm kinh tế + môi trường) cho BAU & OMRH năm 2050.
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

    // ── Xây dựng data cho 1 chart (economic | environment), group theo Indicator ──

    const buildIndicatorChart = (group: MetricGroupKey) => {
        const { left, right: rawRight } = METRIC_GROUPS[group];
        const isVnd = lang === 'vi' && rawRight.key === 'Net Income';
        const right = isVnd ? { ...rawRight, unit: 'triệu VNĐ/ha' } : rawRight;

        const convertRight = (val: number) =>
            isVnd ? Math.round(val * USD_TO_VND / 1000000) : parseFloat(val.toFixed(2));

        const leftRow: Record<string, string | number | null> = { indicator: left.key };
        const rightRow: Record<string, string | number | null> = { indicator: right.key };

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

        if (simResults) {
            leftRow['Simulation_left'] = parseFloat(
                (simResults.predictions[left.key as keyof typeof simResults.predictions] ?? 0).toFixed(2)
            );
            rightRow['Simulation_right'] = convertRight(
                Number(simResults.predictions[right.key as keyof typeof simResults.predictions] ?? 0)
            );
        }

        const data = [leftRow, rightRow];

        const { domain: leftDomain, ticks: leftTicks } = computeDomainAndTicksMulti(
            data,
            SCENARIO_KEYS.map(s => `${s}_left`)
        );
        const { domain: rightDomain, ticks: rightTicks } = computeDomainAndTicksMulti(
            data,
            SCENARIO_KEYS.map(s => `${s}_right`)
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
            ? `Nếu tiếp tục canh tác theo phương pháp hiện tại (Canh tác như thường lệ), đến năm 2050 ${joined} so với năm 2024.`
            : `If current farming practices (Business As Usual) continue unchanged, by 2050 ${joined} compared to 2024.`;
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