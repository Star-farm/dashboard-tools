import type { Translation } from '../../i18n';
import type { KpiChangeResult } from '../../types/dashboard';
import { KPI_CARDS_CONFIG } from './dashboardConfig';

export function buildKpiCards(t: Translation) {
    return KPI_CARDS_CONFIG.map((config) => ({
        ...config,
        unit: config.key === 'Avg Yield' ? t.yieldUnit
            : config.key === 'Labor Intensity' ? t.laborIntensityUnit
                : config.key === 'Net Income' ? t.netIncomeUsdUnit
                    : config.unit,
        label: config.key === 'Avg Yield' ? t.avgYield
            : config.key === 'Labor Intensity' ? t.laborIntensity
                : config.key === 'Net Income' ? t.netIncome
                    : t.profitMargin,
    }));
}

export function buildKeyMessage(
    kpiChange: KpiChangeResult | null,
    t: Translation,
): string {
    return buildKeyMessageParts(kpiChange, t).map(part => part.text).join('');
}

export interface KeyMessagePart {
    text: string;
    tone?: 'text-success' | 'text-danger';
}

export function kpiChangeTone(percentage: number, lowerIsBetter = false): KeyMessagePart['tone'] {
    if (!Number.isFinite(percentage) || percentage === 0) return undefined;
    return (lowerIsBetter ? percentage < 0 : percentage > 0) ? 'text-success' : 'text-danger';
}

export function buildKeyMessageParts(kpiChange: KpiChangeResult | null, t: Translation): KeyMessagePart[] {
    if (!kpiChange?.kpis) return [];
    const indicators = [
        { key: 'Labor Intensity', template: t.laborIntensityIncreaseMessage, lowerIsBetter: true },
        { key: 'Avg Yield', template: t.yieldDecreaseMessage, lowerIsBetter: false },
        { key: 'Net Income', template: t.netIncomeDecreaseMessage, lowerIsBetter: false },
        { key: 'Profit Margin', template: t.profitMarginDecreaseMessage, lowerIsBetter: false },
    ];
    const changes: KeyMessagePart[] = [];
    for (const indicator of indicators) {
        const percentage = kpiChange.kpis[indicator.key]?.pct_change;
        if (percentage == null || !Number.isFinite(percentage) || percentage === 0) continue;
        const favorable = indicator.lowerIsBetter ? percentage < 0 : percentage > 0;
        // This warning summarizes unfavorable outcomes, matching the KPI panel.
        if (favorable) continue;
        if (changes.length) changes.push({ text: ', ' });
        const [before, after = ''] = indicator.template.split('{value}');
        changes.push(
            { text: before },
            { text: `${Math.abs(percentage).toFixed(1)}${after.startsWith('%') ? '%' : ''}`, tone: kpiChangeTone(percentage, indicator.lowerIsBetter) },
            { text: after.startsWith('%') ? after.slice(1) : after },
        );
    }
    if (!changes.length) return [];
    const [before, after = ''] = t.keyMessageTemplate.split('{parts}');
    return [{ text: before }, ...changes, { text: after }];
}
