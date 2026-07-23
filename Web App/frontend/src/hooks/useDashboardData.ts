import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { KpiChangeResult, SimulationResult } from '../types/dashboard';
import { TRANSLATIONS } from '../i18n';
import {
    fetchComparison,
    fetchKpiChange,
    fetchSimulation,
    type ScenarioGroup,
    type ScenarioMetrics,
    type SimulationInputs,
} from '../api/dashboardApi';
import { buildIndicatorChart } from '../features/dashboard/chartTransformers';
import { buildKeyMessage, buildKpiCards } from '../features/dashboard/kpiFormatters';

export {
    KPI_CARDS_CONFIG,
    METRIC_GROUPS,
    PREDICTION_INTERVAL_COLOR,
    SCENARIO_COLORS,
    SCENARIO_KEYS,
    SIMULATION_INPUT_LIMITS,
    USD_TO_VND,
} from '../features/dashboard/dashboardConfig';

const DEFAULT_SCENARIO: ScenarioGroup = 'Business As Usual';
const DEFAULT_INPUTS: SimulationInputs = {
    awd_adoption: 'Without AWD',
    fertilizer_usage: 105,
    pesticide_usage: 6,
    water_usage: 350,
};

function isAbortError(error: unknown): boolean {
    return error instanceof DOMException && error.name === 'AbortError';
}

export function useDashboardData(lang: 'vi' | 'en') {
    const t = TRANSLATIONS[lang];
    const [isInitialLoading, setIsInitialLoading] = useState(true);
    const [kpiChange, setKpiChange] = useState<KpiChangeResult | null>(null);
    const [scenarioMetricValues, setScenarioMetricValues] = useState<ScenarioMetrics>({});
    const [simScenarioGroup, setSimScenarioGroup] = useState<ScenarioGroup>(DEFAULT_SCENARIO);
    const [simInputs, setSimInputs] = useState<SimulationInputs>(DEFAULT_INPUTS);
    const [simResults, setSimResults] = useState<SimulationResult | null>(null);
    const [loadingKpi, setLoadingKpi] = useState(true);
    const [loadingBar, setLoadingBar] = useState(true);
    const [loadingSim, setLoadingSim] = useState(true);
    const [requestError, setRequestError] = useState<string | null>(null);
    const [isMobile, setIsMobile] = useState(
        typeof window !== 'undefined' && window.matchMedia('(max-width: 640px)').matches,
    );
    const simulationController = useRef<AbortController | null>(null);

    useEffect(() => {
        const controller = new AbortController();
        let active = true;

        async function loadInitialData() {
            const [kpiResult, comparisonResult, simulationResult] = await Promise.allSettled([
                fetchKpiChange(controller.signal),
                fetchComparison(controller.signal),
                fetchSimulation(DEFAULT_INPUTS, DEFAULT_SCENARIO, controller.signal),
            ]);
            if (!active) return;

            if (kpiResult.status === 'fulfilled') setKpiChange(kpiResult.value);
            if (comparisonResult.status === 'fulfilled') setScenarioMetricValues(comparisonResult.value);
            if (simulationResult.status === 'fulfilled') setSimResults(simulationResult.value);

            const rejected = [kpiResult, comparisonResult, simulationResult]
                .find((result) => result.status === 'rejected');
            if (rejected?.status === 'rejected' && !isAbortError(rejected.reason)) {
                console.error('Initial dashboard request failed', rejected.reason);
                setRequestError('initial-load-failed');
            }

            setLoadingKpi(false);
            setLoadingBar(false);
            setLoadingSim(false);
            setIsInitialLoading(false);
        }

        void loadInitialData();
        return () => {
            active = false;
            controller.abort();
        };
    }, []);

    useEffect(() => {
        const mediaQuery = window.matchMedia('(max-width: 640px)');
        const handleChange = (event: MediaQueryListEvent) => setIsMobile(event.matches);
        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
    }, []);

    useEffect(() => () => simulationController.current?.abort(), []);

    const runSimulation = useCallback(async () => {
        simulationController.current?.abort();
        const controller = new AbortController();
        simulationController.current = controller;
        setLoadingSim(true);
        setRequestError(null);

        try {
            const result = await fetchSimulation(simInputs, simScenarioGroup, controller.signal);
            if (simulationController.current === controller) setSimResults(result);
        } catch (error) {
            if (!isAbortError(error)) {
                console.error('Simulation request failed', error);
                setRequestError('simulation-failed');
            }
        } finally {
            if (simulationController.current === controller) {
                simulationController.current = null;
                setLoadingSim(false);
            }
        }
    }, [simInputs, simScenarioGroup]);

    const economicChart = useMemo(
        () => buildIndicatorChart('economic', scenarioMetricValues, simResults, lang, t),
        [lang, scenarioMetricValues, simResults, t],
    );
    const environmentChart = useMemo(
        () => buildIndicatorChart('environment', scenarioMetricValues, simResults, lang, t),
        [lang, scenarioMetricValues, simResults, t],
    );
    const kpiCards = useMemo(() => buildKpiCards(t), [t]);
    const keyMessage = useMemo(() => buildKeyMessage(kpiChange, t), [kpiChange, t]);

    return {
        t,
        isInitialLoading,
        requestError,
        kpiChange,
        loadingKpi,
        loadingBar,
        simScenarioGroup,
        setSimScenarioGroup,
        simInputs,
        setSimInputs,
        simResults,
        loadingSim,
        isMobile,
        isVndNetIncome: lang === 'vi',
        economicChart,
        environmentChart,
        KPI_CARDS: kpiCards,
        keyMessage,
        runSimulation,
    };
}
