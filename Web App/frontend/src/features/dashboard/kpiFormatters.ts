import type { Translation } from '../../i18n';
import type { KpiChangeResult } from '../../types/dashboard';
import { KPI_CARDS_CONFIG } from './dashboardConfig';

export function buildKpiCards(t: Translation) {
    return KPI_CARDS_CONFIG.map((config) => ({
        ...config,
        unit: config.key === 'Avg Yield' ? t.yieldUnit
            : config.key === 'Methane Emissions' ? t.methanePerHectareUnit
                : config.key === 'Net Income' ? t.netIncomeUsdUnit
                    : config.unit,
        label: config.key === 'Avg Yield' ? t.avgYield
            : config.key === 'Methane Emissions' ? t.methaneEmissions
                : config.key === 'Net Income' ? t.netIncome
                    : t.profitMargin,
    }));
}

export function buildKeyMessage(
    kpiChange: KpiChangeResult | null,
    t: Translation,
): string {
    if (!kpiChange?.kpis) return '';
    const yieldChange = kpiChange.kpis['Avg Yield']?.pct_change;
    const methaneChange = kpiChange.kpis['Methane Emissions']?.pct_change;
    const incomeChange = kpiChange.kpis['Net Income']?.pct_change;
    const profitChange = kpiChange.kpis['Profit Margin']?.pct_change;
    const parts: string[] = [];

    if (methaneChange != null && methaneChange > 0) {
        parts.push(t.methaneIncreaseMessage.replace('{value}', methaneChange.toFixed(1)));
    }
    if (yieldChange != null && yieldChange < 0) {
        parts.push(t.yieldDecreaseMessage.replace('{value}', Math.abs(yieldChange).toFixed(1)));
    }
    if (incomeChange != null && incomeChange < 0) {
        parts.push(t.netIncomeDecreaseMessage.replace('{value}', Math.abs(incomeChange).toFixed(1)));
    }
    if (profitChange != null && profitChange < 0) {
        parts.push(t.profitMarginDecreaseMessage.replace('{value}', Math.abs(profitChange).toFixed(1)));
    }

    return parts.length ? t.keyMessageTemplate.replace('{parts}', parts.join(', ')) : '';
}
