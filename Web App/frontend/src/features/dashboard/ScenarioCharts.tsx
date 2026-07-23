import React from 'react';
import {
    Bar,
    BarChart,
    ErrorBar,
    LabelList,
    Legend,
    ReferenceLine,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import type { Translation } from '../../i18n';
import type { IndicatorChart } from './chartTransformers';
import {
    PREDICTION_INTERVAL_COLOR,
    SCENARIO_COLORS,
    SCENARIO_KEYS,
} from './dashboardConfig';

interface ScenarioChartsProps {
    t: Translation;
    economicChart: IndicatorChart;
    environmentChart: IndicatorChart;
    loading: boolean;
    isMobile: boolean;
    showVndNote: boolean;
}

function payloadValue(item: unknown, key: string): unknown {
    if (!item || typeof item !== 'object') return undefined;
    const payload = (item as Record<string, unknown>).payload;
    return payload && typeof payload === 'object'
        ? (payload as Record<string, unknown>)[key]
        : undefined;
}

function dataKeyOf(item: unknown): string {
    if (!item || typeof item !== 'object') return '';
    return String((item as Record<string, unknown>).dataKey ?? '');
}

export function ScenarioCharts({
    t,
    economicChart,
    environmentChart,
    loading,
    isMobile,
    showVndNote,
}: ScenarioChartsProps) {
    const metricLabel = (key: string) => {
        switch (key) {
            case 'Avg Yield': return t.avgYield;
            case 'Methane Emissions': return t.methaneEmissions;
            case 'Net Income': return t.netIncome;
            case 'Emission Intensity': return t.emissionIntensity;
            default: return key;
        }
    };
    const scenarioLabel = (key: string) => key === 'Business As Usual'
        ? t.bau
        : key === 'One Million Hectare Rice' ? t.omrh : t.simulatedLabel;
    const formatIndicatorTick = (tick: unknown) => metricLabel(String(tick ?? ''));

    return (
        <div className="col-8" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {[
                { chart: economicChart, title: t.economicGroup },
                { chart: environmentChart, title: t.environmentGroup },
            ].map(({ chart, title }) => (
                <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column' }} key={title}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                        <h2>{title}</h2>
                    </div>
                    {showVndNote && chart === economicChart && (
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '-0.5rem', marginBottom: '0.75rem' }}>
                            {t.exchangeRateNote}
                        </p>
                    )}
                    <div className="chart-container-height" style={{ height: isMobile ? 420 : 380 }}>
                        {loading ? (
                            <div className="centered-fallback">
                                <span className="spinner-text">(o)</span>
                                <span style={{ marginLeft: '0.5rem' }}>{t.loading}</span>
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chart.data} margin={{ top: 20, right: isMobile ? 10 : 20, left: isMobile ? 0 : 10, bottom: isMobile ? 40 : 10 }}>
                                    <XAxis dataKey="indicator" stroke="#000000ff" interval={0} textAnchor="middle" height={40} tick={{ fontSize: isMobile ? 9 : 12 }} tickFormatter={formatIndicatorTick} />
                                    <YAxis yAxisId="left" domain={chart.leftDomain} ticks={chart.leftTicks} tick={{ fontSize: isMobile ? 10 : 12 }} width={isMobile ? 36 : 55} label={isMobile ? undefined : { value: chart.left.unit, angle: -90, position: 'insideLeft', fontSize: 12, offset: 5 }} />
                                    <YAxis yAxisId="right" orientation="right" domain={chart.rightDomain} ticks={chart.rightTicks} tick={{ fontSize: isMobile ? 10 : 12 }} width={isMobile ? 36 : 55} label={isMobile ? undefined : { value: chart.right.unit, angle: 90, position: 'insideRight', fontSize: 12, offset: 5 }} />
                                    <ReferenceLine yAxisId="right" y={0} stroke="#9ca3af" strokeWidth={1.5} strokeDasharray="4 4" />
                                    <Tooltip
                                        contentStyle={{ background: '#FFFFFF', border: '1px solid var(--panel-border)', borderRadius: '8px' }}
                                        labelFormatter={formatIndicatorTick}
                                        formatter={(value: unknown, name: unknown, item: unknown) => {
                                            const numericValue = Number(value ?? 0);
                                            const dataKey = dataKeyOf(item);
                                            const unit = dataKey.endsWith('_right') ? chart.right.unit : chart.left.unit;
                                            const lower = payloadValue(item, `${dataKey}_lower`);
                                            const upper = payloadValue(item, `${dataKey}_upper`);
                                            const level = payloadValue(item, `${dataKey}_level`);
                                            const range = Number.isFinite(Number(lower)) && Number.isFinite(Number(upper))
                                                ? ` (${Math.round(Number(level) * 100)}%: ${Number(lower).toLocaleString()}–${Number(upper).toLocaleString()}${unit ? ` ${unit}` : ''})`
                                                : '';
                                            return [`${numericValue.toLocaleString()}${unit ? ` ${unit}` : ''}${range}`, String(name ?? '')];
                                        }}
                                    />
                                    <Legend wrapperStyle={{ fontSize: isMobile ? '11px' : '13px', paddingTop: isMobile ? 8 : 0 }} />
                                    {SCENARIO_KEYS.map((scenario) => (
                                        <React.Fragment key={scenario}>
                                            <Bar yAxisId="left" dataKey={`${scenario}_left`} name={scenarioLabel(scenario)} fill={SCENARIO_COLORS[scenario]} radius={[4, 4, 0, 0]} stackId={scenario}>
                                                {scenario === 'Simulation' && <ErrorBar dataKey="Simulation_left_error" direction="y" width={8} stroke={PREDICTION_INTERVAL_COLOR} strokeWidth={2} />}
                                                <LabelList dataKey={`${scenario}_left`} position="top" fill={SCENARIO_COLORS[scenario]} style={{ fontSize: isMobile ? '9px' : '11px', fontWeight: 'bold' }} formatter={(value: unknown) => value != null && Number(value) !== 0 ? Number(value).toLocaleString() : ''} />
                                            </Bar>
                                            <Bar yAxisId="right" dataKey={`${scenario}_right`} name={scenarioLabel(scenario)} fill={SCENARIO_COLORS[scenario]} radius={[4, 4, 0, 0]} legendType="none" isAnimationActive={false} stackId={scenario}>
                                                {scenario === 'Simulation' && <ErrorBar dataKey="Simulation_right_error" direction="y" width={8} stroke={PREDICTION_INTERVAL_COLOR} strokeWidth={2} />}
                                                <LabelList dataKey={`${scenario}_right`} position="top" fill={SCENARIO_COLORS[scenario]} style={{ fontSize: isMobile ? '9px' : '11px', fontWeight: 'bold' }} formatter={(value: unknown) => value != null && Number(value) !== 0 ? Number(value).toLocaleString() : ''} />
                                            </Bar>
                                        </React.Fragment>
                                    ))}
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
}
