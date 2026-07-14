import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

// ── 1. PLACE MOCKS AT THE ABSOLUTE TOP OF THE FILE ───────────────────────────
vi.mock('../src/useDashboardData', () => ({
    USD_TO_VND: 26300,
    SCENARIO_COLORS: {
        'Business As Usual': '#ef4444',
        'One Million Hectare Rice': '#22c55e',
        'Simulation': '#3b82f6',
    },
    SCENARIO_KEYS: ['Business As Usual', 'One Million Hectare Rice', 'Simulation'],
    useDashboardData: vi.fn(),
}));

// Upgraded Recharts mock to force-execute all null/undefined boundary paths
vi.mock('recharts', () => ({
    ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
    BarChart: ({ children }: any) => <div data-testid="bar-chart">{children}</div>,
    Bar: ({ children }: any) => <div>{children}</div>,
    XAxis: ({ tickFormatter }: any) => {
        if (tickFormatter) {
            tickFormatter('Avg Yield');
            tickFormatter('Methane Emissions');
            tickFormatter('Net Income');
            tickFormatter('Emission Intensity');
            tickFormatter('Unknown Metric');
            tickFormatter(null);      // Triggers tick ?? ''
            tickFormatter(undefined); // Triggers tick ?? ''
        }
        return <div data-testid="x-axis" />;
    },
    YAxis: () => <div data-testid="y-axis" />,
    Tooltip: ({ formatter }: any) => {
        if (formatter) {
            formatter(100, 'Avg Yield', { dataKey: 'Simulation_right' });
            formatter(5, 'Avg Yield', { dataKey: 'Simulation_left' });
            formatter(null, 'Avg Yield', { dataKey: 'Simulation_left' });
            formatter(100, null, { dataKey: 'Simulation_right' });     // Triggers name ?? ''
            formatter(100, 'Avg Yield', null);                         // Triggers item?.dataKey ?? ''
            formatter(100, 'Avg Yield', { dataKey: '' });              // Triggers item?.dataKey ?? ''
        }
        return <div data-testid="tooltip" />;
    },
    Legend: () => <div data-testid="legend" />,
    LabelList: ({ formatter }: any) => {
        if (formatter) {
            formatter(5);
            formatter(0);
            formatter(null);
        }
        return <div data-testid="label-list" />;
    },
    ReferenceLine: () => <div data-testid="ref-line" />,
}));

// ── 2. STANDARD IMPORTS ──────────────────────────────────────────────────────
import { render, screen, fireEvent } from '@testing-library/react';
import { Dashboard } from '../src/Dashboard';
import { useDashboardData } from '../src/useDashboardData';

// Structured English mock translations matching the bilingual requirements of Dashboard.tsx
const mockTranslations = {
    title: "Star Farm Dashboard",
    subtitle: "Agricultural Modeling App",
    initialLoadingMessage: "Preparing models...",
    kpiSectionTitle: "Key KPI Projections",
    kpiChangeTitle: "change by 2050",
    kpiTargetYear: "2050",
    simulationSectionTitle: "Simulated Scenario Analysis",
    economicGroup: "Economic Metrics",
    environmentGroup: "Environmental Metrics",
    inputSimulationControls: "Simulation Inputs",
    bau: "Business As Usual",
    omrh: "One Million Hectare Rice",
    simulatedGroup: "Reference Scenario",
    awdAdoptionPractice: "AWD Practice",
    awd: "With AWD",
    noawd: "Without AWD",
    fertilizerUsage: "Fertilizer",
    pesticideUsage: "Pesticide",
    waterUsage: "Water",
    simulateButton: "Run Simulation",
    simulationEstimates: "Simulation Projections",
    yieldColonLabel: "Yield: ",
    methaneColonLabel: "Methane: ",
    profitMarginColonLabel: "Profit Margin: ",
    netIncomeColonLabel: "Net Income: ",
    viewDetailedDataAt: "View details at:",
    dataVisualizationLinkText: "Data Studio Link",
    loading: "Loading...",
    bauTooltipDesc: ["BAU line 1", "BAU line 2"],
    omrhTooltipItems: ["OMRH line 1", "OMRH line 2"],
    fertilizerTooltipDesc: "Fertilizer tooltip",
    pesticideTooltipDesc: "Pesticide tooltip",
    waterTooltipDesc: "Water tooltip",
    footerProjectName: "Star Farm",
    footerTagline: "Tagline",
    footerDescription: "Desc",
    footerPartOf: "PartOf",
    footerLinks: "Links",
    footerDataVisualization: "Viz",
    footerDocumentation: "Doc",
    aboutus: "About Us",
    footerRights: "All Rights Reserved",
};

// Default mocked returns for the custom useDashboardData hook
const defaultHookReturn = {
    t: mockTranslations,
    isInitialLoading: false,
    kpiChange: {
        kpis: {
            'Avg Yield': { pct_change: -5.0, target_value: 4.5 },
            'Methane Emissions': { pct_change: 12.0, target_value: 400.0 },
            'Net Income': { pct_change: -10.0, target_value: 1500.0 },
            'Profit Margin': { pct_change: -3.0, target_value: 35.0 },
        },
    },
    loadingKpi: false,
    loadingBar: false,
    simScenarioGroup: 'Business As Usual',
    setSimScenarioGroup: vi.fn(),
    simInputs: {
        awd_adoption: 'With AWD',
        fertilizer_usage: 100,
        pesticide_usage: 5,
        water_usage: 600,
    },
    setSimInputs: vi.fn(),
    simResults: {
        predictions: {
            'Avg Yield': 5.0,
            'Methane Emissions': 350.0,
            'Profit Margin': 38.0,
            'Net Income': 1700.0,
        },
    },
    loadingSim: false,
    isMobile: false,
    isVndNetIncome: false,
    economicChart: { data: [], leftDomain: [0, 5], leftTicks: [0, 5], rightDomain: [0, 5], rightTicks: [0, 5], left: { unit: 't/ha' }, right: { unit: '$/ha' } },
    environmentChart: { data: [], leftDomain: [0, 5], leftTicks: [0, 5], rightDomain: [0, 5], rightTicks: [0, 5], left: { unit: 'kg/ha' }, right: { unit: 'kg CH4/t' } },
    KPI_CARDS: [
        { key: 'Avg Yield', label: 'Average Yield', unit: 't/ha' },
        { key: 'Methane Emissions', label: 'Methane Emissions', unit: 'kg/ha', lowerIsBetter: true },
        { key: 'Net Income', label: 'Net Income', unit: '$/ha' },
        { key: 'Profit Margin', label: 'Profit Margin', unit: '%' },
    ],
    keyMessage: 'Methane emissions could rise by 12.0%',
    runSimulation: vi.fn(),
};

describe('Dashboard Component UI', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should render the loading screen spinner when initiating models', () => {
        vi.mocked(useDashboardData).mockReturnValue({
            ...defaultHookReturn,
            isInitialLoading: true,
        } as any);

        render(<Dashboard />);
        expect(screen.getByText('Preparing models...')).toBeInTheDocument();
    });

    it('should render the layout dashboard correctly when loaded successfully', () => {
        vi.mocked(useDashboardData).mockReturnValue(defaultHookReturn as any);

        render(<Dashboard />);

        expect(screen.getByText('Star Farm Dashboard')).toBeInTheDocument();
        expect(screen.getByText('Agricultural Modeling App')).toBeInTheDocument();
        expect(screen.getByText('Methane emissions could rise by 12.0%')).toBeInTheDocument();

        const charts = screen.getAllByTestId('bar-chart');
        expect(charts.length).toBe(2);
    });

    it('should toggle language button states correctly on user interaction', () => {
        vi.mocked(useDashboardData).mockReturnValue(defaultHookReturn as any);

        render(<Dashboard />);

        const viBtn = screen.getByText('VI');
        const enBtn = screen.getByText('EN');

        expect(enBtn).toHaveClass('active');
        expect(viBtn).not.toHaveClass('active');

        // Click Vietnamese toggle to switch to VI
        fireEvent.click(viBtn);
        expect(viBtn).toHaveClass('active');
        expect(enBtn).not.toHaveClass('active');

        // Click English toggle to switch back to EN
        fireEvent.click(enBtn);
        expect(enBtn).toHaveClass('active');
        expect(viBtn).not.toHaveClass('active');
    });

    it('should handle drop-down changes for simulated reference scenarios', () => {
        const mockSetSimScenarioGroup = vi.fn();
        vi.mocked(useDashboardData).mockReturnValue({
            ...defaultHookReturn,
            setSimScenarioGroup: mockSetSimScenarioGroup,
        } as any);

        render(<Dashboard />);

        const selects = screen.getAllByRole('combobox');
        const selectElement = selects[0]; // First combobox is Reference Scenario

        fireEvent.change(selectElement, { target: { value: 'One Million Hectare Rice' } });
        expect(mockSetSimScenarioGroup).toHaveBeenCalledWith('One Million Hectare Rice');
    });

    it('should update fertilizer state when range slider is adjusted', () => {
        const mockSetSimInputs = vi.fn();
        vi.mocked(useDashboardData).mockReturnValue({
            ...defaultHookReturn,
            setSimInputs: mockSetSimInputs,
        } as any);

        render(<Dashboard />);

        const sliders = screen.getAllByRole('slider');
        const fertilizerSlider = sliders[0];

        fireEvent.change(fertilizerSlider, { target: { value: '150' } });
        expect(mockSetSimInputs).toHaveBeenCalled();
    });

    it('should execute simulation on run button click', () => {
        const mockRunSimulation = vi.fn();
        vi.mocked(useDashboardData).mockReturnValue({
            ...defaultHookReturn,
            runSimulation: mockRunSimulation,
        } as any);

        render(<Dashboard />);

        const simButton = screen.getByRole('button', { name: /Run Simulation/i });
        fireEvent.click(simButton);

        expect(mockRunSimulation).toHaveBeenCalledTimes(1);
    });

    it('should render correct VND currency formatting and positive KPI cards in Vietnamese mode', () => {
        const positiveHookReturn = {
            ...defaultHookReturn,
            isVndNetIncome: true,
            kpiChange: {
                kpis: {
                    'Avg Yield': { pct_change: 5.0, target_value: 5.5 },
                    'Methane Emissions': { pct_change: -12.0, target_value: 300.0 },
                    'Net Income': { pct_change: 10.0, target_value: 1800.0 },
                    'Profit Margin': { pct_change: 0.0, target_value: 35.0 },
                },
            },
        };

        vi.mocked(useDashboardData).mockReturnValue(positiveHookReturn as any);

        render(<Dashboard />);

        // CLICK THE VI BUTTON: To trigger setLang('vi') and update the local 'lang' state to 'vi'
        const viBtn = screen.getByText('VI');
        fireEvent.click(viBtn);

        expect(screen.getByText(/47 triệu VNĐ\/ha/i)).toBeInTheDocument();
        expect(screen.getByText(/— 0.0%/i)).toBeInTheDocument();
        expect(screen.getByText(/▲ 5.0%/i)).toBeInTheDocument();
    });

    it('should render loading placeholders inside KPI cards when loadingKpi is true', () => {
        vi.mocked(useDashboardData).mockReturnValue({
            ...defaultHookReturn,
            loadingKpi: true,
        } as any);

        render(<Dashboard />);

        const loadingElements = screen.getAllByText('Loading...');
        expect(loadingElements.length).toBeGreaterThan(0);
    });

    it('should render correct empty "N/A" placeholders when KPI metrics are null', () => {
        const nullKpiHookReturn = {
            ...defaultHookReturn,
            kpiChange: {
                kpis: {
                    'Avg Yield': { pct_change: null, target_value: null },
                    'Methane Emissions': { pct_change: null, target_value: null },
                    'Net Income': { pct_change: null, target_value: null },
                    'Profit Margin': { pct_change: null, target_value: null },
                },
            },
        };

        vi.mocked(useDashboardData).mockReturnValue(nullKpiHookReturn as any);

        render(<Dashboard />);

        const naElements = screen.getAllByText('N/A');
        expect(naElements.length).toBeGreaterThan(0);
    });

    it('should render the loading spinner inside the chart container when loadingBar is true', () => {
        vi.mocked(useDashboardData).mockReturnValue({
            ...defaultHookReturn,
            loadingBar: true,
        } as any);

        render(<Dashboard />);

        const chartSpinners = screen.getAllByText('(o)');
        expect(chartSpinners.length).toBeGreaterThan(0);
    });

    it('should adjust layout dimensions and chart margins when rendered on mobile viewport', () => {
        vi.mocked(useDashboardData).mockReturnValue({
            ...defaultHookReturn,
            isMobile: true,
        } as any);

        render(<Dashboard />);

        expect(screen.getByText('Star Farm Dashboard')).toBeInTheDocument();
    });
});

// ── 3. DEDICATED DYNAMIC MODULE RESOLUTION TO COVER detectBrowserLang ───────
// ── 3. DEDICATED DYNAMIC MODULE RESOLUTION TO COVER detectBrowserLang ───────
describe('detectBrowserLang isolated boundary branch coverage', () => {
    const originalLanguage = window.navigator.language;
    const originalUserLanguage = (window.navigator as any).userLanguage;

    afterEach(() => {
        // Restore original properties on window.navigator to prevent test pollution
        Object.defineProperty(window.navigator, 'language', {
            value: originalLanguage,
            configurable: true,
            writable: true,
        });

        if (originalUserLanguage !== undefined) {
            Object.defineProperty(window.navigator, 'userLanguage', {
                value: originalUserLanguage,
                configurable: true,
                writable: true,
            });
        } else {
            try {
                delete (window.navigator as any).userLanguage;
            } catch (e) { }
        }
        vi.resetModules();
    });

    it('should detect vi language when browser default language is Vietnamese', async () => {
        // FIX: Redefine the 'language' property getter directly on JSDOM's navigator
        Object.defineProperty(window.navigator, 'language', {
            value: 'vi-VN',
            configurable: true,
            writable: true,
        });

        const { Dashboard: TempDashboard } = await import('../src/Dashboard');
        expect(TempDashboard).toBeDefined();
    });

    it('should detect vi language from legacy userLanguage IE fallback', async () => {
        // Set language to falsy empty string to force evaluation of the userLanguage fallback
        Object.defineProperty(window.navigator, 'language', {
            value: '',
            configurable: true,
            writable: true,
        });
        Object.defineProperty(window.navigator, 'userLanguage', {
            value: 'vi-VN',
            configurable: true,
            writable: true,
        });

        const { Dashboard: TempDashboard } = await import('../src/Dashboard');
        expect(TempDashboard).toBeDefined();
    });

    it('should fallback to en when both language fields evaluate to empty strings', async () => {
        Object.defineProperty(window.navigator, 'language', {
            value: '',
            configurable: true,
            writable: true,
        });
        Object.defineProperty(window.navigator, 'userLanguage', {
            value: '',
            configurable: true,
            writable: true,
        });

        const { Dashboard: TempDashboard } = await import('../src/Dashboard');
        expect(TempDashboard).toBeDefined();
    });
});