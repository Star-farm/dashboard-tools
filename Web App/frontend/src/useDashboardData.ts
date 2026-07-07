import { useState, useEffect, useMemo, useRef } from 'react';
import type { ScenarioInfo, SimulationResult, KpiChangeResult } from './types';
import { TRANSLATIONS } from './translations';
import { API_BASE } from './config';


export const USD_TO_VND = 26300;

export type MetricGroupKey = 'economic' | 'environment';

export const METRIC_GROUPS: Record<MetricGroupKey, {
    left: { key: string; unit: string; color: string };
    right: { key: string; unit: string; color: string };
}> = {
    economic: {
        left: { key: 'Avg Yield', unit: 't/ha', color: '#22c55e' },
        right: { key: 'Net Income', unit: '$/ha', color: '#eab308' },
    },
    environment: {
        left: { key: 'Methane Emissions', unit: 'kg/ha', color: '#ef4444' },
        right: { key: 'Emission Intensity', unit: 'kg CH4/t', color: '#3b82f6' },
    },
};

export const KPI_CARDS_CONFIG: { key: string; unit: string; lowerIsBetter?: boolean }[] = [
    { key: 'Avg Yield', unit: 't/ha' },
    { key: 'Methane Emissions', unit: 'kg/ha', lowerIsBetter: true },
    { key: 'Net Income', unit: '$/ha' },
    { key: 'Profit Margin', unit: '%' },
];



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

const computeDomainAndTicks = (data: Record<string, string | number>[], key: string): { domain: [number, number]; ticks: number[] } => {
    let minVal = 0;
    let maxVal = 0;
    data.forEach(item => {
        const val = Number(item[key]);
        if (!isNaN(val)) {
            minVal = Math.min(minVal, val);
            maxVal = Math.max(maxVal, val);
        }
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

    const [metricGroup, setMetricGroup] = useState<MetricGroupKey>('economic');
    const [barChartData, setBarChartData] = useState<Record<string, string | number>[]>([]);
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

    const isFirstRender = useRef(true);

    // ── Fetchers ────────────────────────────────────────────────────────────

    const fetchScenarios = async () => {
        try {
            const res = await fetch(`${API_BASE}/scenarios`);
            const data = await res.json();
            setScenariosInfo(data);
        } catch (e) {
            console.error("Error loading scenarios", e);
        }
    };

    const fetchKpiChange = async () => {
        setLoadingKpi(true);
        try {
            const res = await fetch(`${API_BASE}/kpi-change`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
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

    const fetchBarChartData = async (group: MetricGroupKey = metricGroup) => {
        setLoadingBar(true);
        try {
            const { left, right } = METRIC_GROUPS[group];
            const res = await fetch(`${API_BASE}/compare`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    metrics: [left.key, right.key],
                    dimension: 'Scenario Group',
                    filters: { Year: '2050' }
                })
            });
            if (!res.ok) throw new Error('compare fetch failed');
            const data = await res.json();

            if (data.result && data.result.compare_breakdown) {
                const breakdown = data.result.compare_breakdown as Record<string, Record<string, number>>;
                const formatted = Object.entries(breakdown).map(([name, vals]) => {
                    const rightRaw = Number(vals[right.key] ?? 0);
                    const rightVal = isVndNetIncome ? Math.round(rightRaw * USD_TO_VND / 1000000) : rightRaw;
                    return {
                        name,
                        [left.key]: parseFloat(Number(vals[left.key] ?? 0).toFixed(2)),
                        [right.key]: isVndNetIncome ? rightVal : parseFloat(rightVal.toFixed(2)),
                    };
                });
                setBarChartData(formatted);
            } else {
                setBarChartData([]);
            }
        } catch (e) {
            console.error("Error loading bar chart data", e);
            setBarChartData([]);
        } finally {
            setLoadingBar(false);
        }
    };

    const runSimulation = async (inputs = simInputs, scenarioGroup = simScenarioGroup) => {
        setLoadingSim(true);
        try {
            const res = await fetch(`${API_BASE}/simulate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
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
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }
        fetchBarChartData(metricGroup);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [metricGroup]);

    useEffect(() => {
        const loadInitialData = async () => {
            try {
                await fetchScenarios();
                await fetchKpiChange();
                await runSimulation();
                await fetchBarChartData(metricGroup);
            } catch (e) {
                console.error("Error performing coordinated dashboard load", e);
            } finally {
                setIsInitialLoading(false);
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

    // ── Derived values ──────────────────────────────────────────────────────

    const { left, right: rawRight } = METRIC_GROUPS[metricGroup];
    const isVndNetIncome = lang === 'vi' && rawRight.key === 'Net Income';
    const right = isVndNetIncome ? { ...rawRight, unit: 'triệu VNĐ/ha' } : rawRight;

    const combinedBarChartData = useMemo(() => {
        if (!simResults) return barChartData;
        const rightRaw = Number(simResults.predictions[right.key as keyof typeof simResults.predictions] ?? 0);
        const rightVal = isVndNetIncome ? Math.round(rightRaw * USD_TO_VND / 1000000) : rightRaw;
        const simEntry = {
            name: `${t.simulatedLabel} (${simScenarioGroup === 'Business As Usual' ? t.bau : t.omrh})`,
            [left.key]: parseFloat((simResults.predictions[left.key as keyof typeof simResults.predictions] ?? 0).toFixed(2)),
            [right.key]: isVndNetIncome ? rightVal : parseFloat(rightVal.toFixed(2)),
        };
        return [...barChartData, simEntry];
    }, [barChartData, simResults, simScenarioGroup, t, left.key, right.key, isVndNetIncome]);

    const { domain: leftDomain, ticks: leftTicks } = useMemo(
        () => computeDomainAndTicks(combinedBarChartData, left.key),
        [combinedBarChartData, left.key]
    );

    const { domain: rightDomain, ticks: rightTicks } = useMemo(
        () => computeDomainAndTicks(combinedBarChartData, right.key),
        [combinedBarChartData, right.key]
    );

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
        metricGroup, setMetricGroup, barChartData, loadingBar,
        simScenarioGroup, setSimScenarioGroup, simInputs, setSimInputs, simResults, loadingSim,
        isMobile,
        left, right,
        isVndNetIncome,
        combinedBarChartData,
        leftDomain, leftTicks, rightDomain, rightTicks,
        KPI_CARDS,
        keyMessage,
        runSimulation,
    };
}