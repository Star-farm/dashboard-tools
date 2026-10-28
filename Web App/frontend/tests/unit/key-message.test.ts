import { describe, expect, it } from 'vitest';
import { buildKeyMessage, buildKeyMessageParts, kpiChangeTone } from '../../src/features/dashboard/kpiFormatters';
import { TRANSLATIONS } from '../../src/i18n';
import type { KpiChangeResult } from '../../src/types/dashboard';

describe('summary emphasis', () => {
    it('classifies improvement by the preferred direction of the indicator', () => {
        expect(kpiChangeTone(12)).toBe('text-success');
        expect(kpiChangeTone(-12)).toBe('text-danger');
        expect(kpiChangeTone(-12, true)).toBe('text-success');
        expect(kpiChangeTone(12, true)).toBe('text-danger');
        expect(kpiChangeTone(0)).toBeUndefined();
        expect(kpiChangeTone(NaN)).toBeUndefined();
    });

    it.each(['vi', 'en'] as const)('emphasizes each percentage without coloring the years (%s)', language => {
        const changes: KpiChangeResult = {
            scenario_group: 'Business As Usual', base_year: 2022, target_year: 2050,
            kpis: {
                'Avg Yield': { pct_change: -12.7, base_value: 7, target_value: 6 },
                'Net Income': { pct_change: -38.8, base_value: 1000, target_value: 612 },
                'Profit Margin': { pct_change: -41.3, base_value: 40, target_value: 23.5 },
            },
        };
        const parts = buildKeyMessageParts(changes, TRANSLATIONS[language]);
        expect(parts.filter(part => part.tone)).toEqual([
            { text: '12.7%', tone: 'text-danger' },
            { text: '38.8%', tone: 'text-danger' },
            { text: '41.3%', tone: 'text-danger' },
        ]);
        expect(parts.map(part => part.text).join('')).toBe(buildKeyMessage(changes, TRANSLATIONS[language]));
        expect(parts.filter(part => !part.tone).map(part => part.text).join('')).toContain('2050');
    });
});
