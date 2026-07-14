import { renderHook, act } from '@testing-library/react';
import { useDashboardData } from '../useDashboardData'; // Removed unused USD_TO_VND import
import { vi, describe, it, expect, beforeEach } from 'vitest';

const mockScenarios = {
    scenario_groups: ['Business As Usual', 'One Million Hectare Rice']
};

const mockKpiChange = {
    kpis: {
        'Avg Yield': { pct_change: -5.0, target_value: 4.5 },
        'Methane Emissions': { pct_change: 12.0, target_value: 400.0 },
        'Net Income': { pct_change: -10.0, target_value: 1500.0 },
        'Profit Margin': { pct_change: -3.0, target_value: 35.0 }
    }
};

const mockCompare = {
    result: {
        compare_breakdown: {
            'Business As Usual': { 'Avg Yield': 4.5, 'Net Income': 1500.0 },
            'One Million Hectare Rice': { 'Avg Yield': 5.2, 'Net Income': 1800.0 }
        }
    }
};

const mockSimulate = {
    predictions: {
        'Avg Yield': 5.0,
        'Methane Emissions': 350.0,
        'Profit Margin': 38.0,
        'Net Income': 1700.0
    }
};

describe('useDashboardData Custom Hook', () => {
    beforeEach(() => {
        // FIX: Use vi.stubGlobal to safely mock the global 'fetch' API 
        // without relying on Node's 'global' namespace.
        vi.stubGlobal('fetch', vi.fn().mockImplementation((url: string) => {
            if (url.includes('/scenarios')) {
                return Promise.resolve({ ok: true, json: () => Promise.resolve(mockScenarios) });
            }
            if (url.includes('/kpi-change')) {
                return Promise.resolve({ ok: true, json: () => Promise.resolve(mockKpiChange) });
            }
            if (url.includes('/compare')) {
                return Promise.resolve({ ok: true, json: () => Promise.resolve(mockCompare) });
            }
            if (url.includes('/simulate')) {
                return Promise.resolve({ ok: true, json: () => Promise.resolve(mockSimulate) });
            }
            return Promise.resolve({ ok: false });
        }));
    });

    it('should initialize and load default data correctly on mount', async () => {
        const { result } = renderHook(() => useDashboardData('en'));

        // Wait for microtasks to resolve after state updates
        await act(async () => {
            await new Promise((resolve) => setTimeout(resolve, 0));
        });

        expect(result.current.isInitialLoading).toBe(false);
        expect(result.current.scenariosInfo).toEqual(mockScenarios);
        expect(result.current.kpiChange).toEqual(mockKpiChange);
        expect(result.current.simResults).toEqual(mockSimulate);
    });

    it('should generate the correct dynamic key message based on negative KPI shifts', async () => {
        const { result } = renderHook(() => useDashboardData('en'));

        await act(async () => {
            await new Promise((resolve) => setTimeout(resolve, 0));
        });

        // The mock state contains declines in yield, net income, profit margins, and increased methane
        const message = result.current.keyMessage;
        expect(message).toContain('methane emissions could rise by 12.0%');
        expect(message).toContain('average yield could drop 5.0%');
        expect(message).toContain('net income could fall 10.0%');
        expect(message).toContain('profit margin could shrink 3.0%');
    });

    it('should support Vietnamese translation and configure VND currency conversions', async () => {
        const { result } = renderHook(() => useDashboardData('vi'));

        await act(async () => {
            await new Promise((resolve) => setTimeout(resolve, 0));
        });

        expect(result.current.isVndNetIncome).toBe(true);
        // Verifies the key warning is properly composed in Vietnamese
        expect(result.current.keyMessage).toContain('phát thải khí methane có thể tăng 12.0%');
    });
});