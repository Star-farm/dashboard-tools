import { useState } from 'react';
import {
    ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, LabelList
} from 'recharts';
import { ReferenceLine } from 'recharts';
import { useDashboardData, USD_TO_VND } from './useDashboardData';
export function Dashboard() {
    const [lang, setLang] = useState<'vi' | 'en'>('vi');
    const getMetricLabel = (key: string) => {
        switch (key) {
            case 'Avg Yield': return t.avgYield;
            case 'Methane Emissions': return t.methaneEmissions;
            case 'Net Income': return t.netIncome;
            case 'Emission Intensity': return t.emissionIntensity;
            default: return key;
        }
    };

    const formatXAxisTick = (tick: unknown) => {
        const tickStr = String(tick ?? '');
        if (!tickStr) return '';
        if (tickStr.includes(t.simulatedLabel)) {
            return isMobile ? t.simulatedLabel : tickStr;
        }

        switch (tickStr) {
            case 'Business As Usual':
                return isMobile ? (lang === 'vi' ? 'BAU' : 'BAU') : t.bau;
            case 'One Million Hectare Rice':
                return isMobile ? (lang === 'vi' ? 'OMHR' : 'OMHR') : t.omrh;
            default:
                return tickStr;
        }
    };
    const {
        t, isInitialLoading,
        kpiChange, loadingKpi,
        metricGroup, setMetricGroup, loadingBar,
        simScenarioGroup, setSimScenarioGroup, simInputs, setSimInputs, simResults, loadingSim,
        isMobile,
        left, right,
        isVndNetIncome,
        combinedBarChartData,
        leftDomain, leftTicks, rightDomain, rightTicks,
        KPI_CARDS,
        keyMessage,
        runSimulation,
    } = useDashboardData(lang);

    if (isInitialLoading) {
        return (
            <div className="initial-loading-screen">
                <div className="initial-loading-spinner" />
                <p>{t.initialLoadingMessage}</p>
            </div>
        );
    }

    const renderKpiCard = (cfg: typeof KPI_CARDS[number]) => {
        const entry = kpiChange?.kpis?.[cfg.key];
        const pct = entry?.pct_change;
        const isGood = pct != null && (cfg.lowerIsBetter ? pct < 0 : pct > 0);
        const colorClass = pct == null ? '' : (isGood ? 'text-success' : 'text-danger');
        const arrow = pct == null ? '' : (pct > 0 ? '▲' : pct < 0 ? '▼' : '—');

        return (
            <div className="metric-card" key={cfg.key}>
                <span className="label">{cfg.label}</span>
                <span className={`value ${colorClass}`}>
                    {loadingKpi ? t.loading : (pct != null ? `${arrow} ${Math.abs(pct).toFixed(1)}%` : 'N/A')}
                </span>
                <span className={`subtext ${colorClass}`}>
                    {t.kpiChangeTitle}
                    {entry?.target_value != null && (() => {
                        const isVnd = lang === 'vi' && cfg.key === 'Net Income';
                        const displayVal = isVnd ? Math.round(entry.target_value * USD_TO_VND) : entry.target_value;
                        const displayUnit = isVnd ? 'đ/ha' : cfg.unit;
                        return (
                            <> &middot; {t.kpiTargetYear}: {displayVal.toLocaleString(undefined, { maximumFractionDigits: 0 })} {displayUnit}</>
                        );
                    })()}
                </span>
            </div>
        );
    };
    return (
        <div className="dashboard-container">
            <header>
                <div className="header-title">
                    <h1>{t.title}</h1>
                    <p>{t.subtitle}</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div className="lang-toggle-container">
                        <button type="button" className={`lang-toggle-btn ${lang === 'vi' ? 'active' : ''}`} onClick={() => setLang('vi')}>VI</button>
                        <button type="button" className={`lang-toggle-btn ${lang === 'en' ? 'active' : ''}`} onClick={() => setLang('en')}>EN</button>
                    </div>
                </div>
            </header>

            <section className="glass-panel">
                <h2>{t.kpiSectionTitle}</h2>
                <div className="metrics-row">
                    {KPI_CARDS.map(renderKpiCard)}
                </div>
            </section>

            {!loadingKpi && keyMessage && (
                <section className="glass-panel key-message-panel">
                    <div style={{ display: 'flex', gap: isMobile ? '0.6rem' : '1rem', alignItems: 'flex-start' }}>
                        <p style={{
                            color: '#ff0202ff',
                            fontSize: isMobile ? '0.85rem' : '1.15rem',
                            lineHeight: isMobile ? 1.5 : 1.7,
                            fontWeight: 500,
                            margin: 0,
                            wordBreak: 'break-word',
                        }}>
                            {keyMessage}
                        </p>
                    </div>
                </section>
            )}
            <h2 style={{ marginBottom: '1rem' }}>{t.simulationSectionTitle}</h2>
            <div className="dashboard-grid">
                <div className="glass-panel col-8" style={{ display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                        <h2>{t.impactComparison}</h2>
                        <div className="metric-toggle">
                            <button
                                type="button"
                                className={`btn ${metricGroup === 'economic' ? '' : 'btn-ghost'}`}
                                style={{ padding: '0.3rem 0.8rem', fontSize: '1rem' }}
                                onClick={() => setMetricGroup('economic')}
                            >
                                {t.economicGroup}
                            </button>
                            <button
                                type="button"
                                className={`btn ${metricGroup === 'environment' ? '' : 'btn-ghost'}`}
                                style={{ padding: '0.3rem 0.8rem', fontSize: '1rem' }}
                                onClick={() => setMetricGroup('environment')}
                            >
                                {t.environmentGroup}
                            </button>
                        </div>
                    </div>
                    {isVndNetIncome && (
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '-0.5rem', marginBottom: '0.75rem' }}>
                            {t.exchangeRateNote}
                        </p>
                    )}
                    <div className="chart-container-height" style={{ height: isMobile ? 600 : undefined, flex: isMobile ? 'none' : 1, minHeight: isMobile ? undefined : 450 }}>
                        {loadingBar ? (
                            <div className="centered-fallback">
                                <span className="spinner-text">(o)</span>
                                <span style={{ marginLeft: '0.5rem' }}>{t.loading}</span>
                            </div>
                        ) : combinedBarChartData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                    data={combinedBarChartData}
                                    margin={{ top: 20, right: isMobile ? 10 : 20, left: isMobile ? 0 : 10, bottom: isMobile ? 100 : 10 }}
                                >
                                    <XAxis
                                        dataKey="name"
                                        stroke="#000000ff"
                                        interval={0}
                                        angle={isMobile ? 0 : 0}
                                        textAnchor="middle"
                                        height={isMobile ? 50 : 40}
                                        tick={{ fontSize: isMobile ? 9 : 12 }}
                                        tickFormatter={formatXAxisTick}
                                    />
                                    <YAxis
                                        stroke={left.color}
                                        yAxisId="left"
                                        domain={leftDomain}
                                        ticks={leftTicks}
                                        tick={{ fontSize: isMobile ? 10 : 12 }}
                                        width={isMobile ? 36 : 55}
                                        label={isMobile ? undefined : { value: left.unit, angle: -90, position: 'insideLeft', fill: left.color, fontSize: 12, offset: 5 }}
                                    />
                                    <YAxis
                                        stroke={right.color}
                                        yAxisId="right"
                                        orientation="right"
                                        domain={rightDomain}
                                        ticks={rightTicks}
                                        tick={{ fontSize: isMobile ? 10 : 12 }}
                                        width={isMobile ? 36 : 55}
                                        label={isMobile ? undefined : { value: right.unit, angle: 90, position: 'insideRight', fill: right.color, fontSize: 12, offset: 5 }}
                                    />
                                    <ReferenceLine
                                        yAxisId="right"
                                        y={0}
                                        stroke="#9ca3af"
                                        strokeWidth={1.5}
                                        strokeDasharray="4 4"
                                    />
                                    <Tooltip
                                        contentStyle={{ background: '#FFFFFF', border: '1px solid var(--panel-border)', borderRadius: '8px' }}
                                        labelFormatter={formatXAxisTick}
                                        formatter={(value: unknown, name: unknown) => {
                                            const numValue = Number(value ?? 0);
                                            const nameStr = String(name ?? '');
                                            const unit = nameStr === getMetricLabel(left.key) ? left.unit : nameStr === getMetricLabel(right.key) ? right.unit : '';
                                            return [`${numValue.toLocaleString()} ${unit}`, nameStr];
                                        }}
                                    />
                                    <Legend wrapperStyle={{ fontSize: isMobile ? '11px' : '13px', paddingTop: isMobile ? 8 : 0 }} />

                                    <Bar
                                        yAxisId="left"
                                        dataKey={left.key}
                                        name={getMetricLabel(left.key)}
                                        fill={left.color}
                                        radius={[4, 4, 0, 0]}
                                    >
                                        <LabelList dataKey={left.key} position="top" fill={left.color} style={{ fontSize: isMobile ? '9px' : '12px', fontWeight: 'bold' }}
                                            formatter={(value: unknown) => Number(value ?? 0).toLocaleString()} />
                                    </Bar>

                                    <Bar
                                        yAxisId="right"
                                        dataKey={right.key}
                                        name={getMetricLabel(right.key)}
                                        fill={right.color}
                                        radius={[4, 4, 0, 0]}
                                    >
                                        <LabelList dataKey={right.key} position="top" fill={right.color} style={{ fontSize: isMobile ? '9px' : '12px', fontWeight: 'bold' }}
                                            formatter={(value: unknown) => Number(value ?? 0).toLocaleString()} />
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="centered-fallback">{t.noData}</div>
                        )}
                    </div>
                </div>

                <div className="glass-panel col-4">
                    <h2>{t.inputSimulationControls}</h2>
                    <div className="slider-group" style={{ marginTop: '1rem' }}>
                        <div className="slider-item">
                            <label className="filter-label">{t.simulatedGroup}</label>
                            <select
                                className="select-input"
                                value={simScenarioGroup}
                                onChange={(e) => setSimScenarioGroup(e.target.value as 'Business As Usual' | 'One Million Hectare Rice')}
                            >
                                <option value="Business As Usual">{t.bau}</option>
                                <option value="One Million Hectare Rice">{t.omrh}</option>
                            </select>
                        </div>

                        <div className="slider-item">
                            <label className="filter-label">{t.awdAdoptionPractice}</label>
                            <select
                                className="select-input"
                                value={simInputs.awd_adoption}
                                onChange={(e) => setSimInputs(prev => ({ ...prev, awd_adoption: e.target.value }))}
                            >
                                <option value="With AWD">{t.awd}</option>
                                <option value="Without AWD">{t.noawd}</option>
                            </select>
                        </div>

                        <div className="slider-item">
                            <div className="slider-label-row">
                                <span className="name">{t.fertilizerUsage}</span>
                                <span className="value">{simInputs.fertilizer_usage} kg/ha</span>
                            </div>
                            <input type="range" min="50" max="250" value={simInputs.fertilizer_usage}
                                onChange={(e) => setSimInputs(prev => ({ ...prev, fertilizer_usage: Number(e.target.value) }))} />
                        </div>

                        <div className="slider-item">
                            <div className="slider-label-row">
                                <span className="name">{t.pesticideUsage}</span>
                                <span className="value">{simInputs.pesticide_usage} kg/ha</span>
                            </div>
                            <input type="range" min="1" max="15" value={simInputs.pesticide_usage}
                                onChange={(e) => setSimInputs(prev => ({ ...prev, pesticide_usage: Number(e.target.value) }))} />
                        </div>

                        <div className="slider-item">
                            <div className="slider-label-row">
                                <span className="name">{t.waterUsage}</span>
                                <span className="value">{simInputs.water_usage} m³/ha</span>
                            </div>
                            <input type="range" min="200" max="1200" value={simInputs.water_usage}
                                onChange={(e) => setSimInputs(prev => ({ ...prev, water_usage: Number(e.target.value) }))} />
                        </div>

                        <button className="btn" style={{ width: '100%', marginTop: '0.5rem' }} onClick={() => runSimulation()} disabled={loadingSim}>
                            {loadingSim ? <span className="spinner-text">(o)</span> : t.simulateButton}
                        </button>

                        {simResults && (
                            <div className="simulation-estimates-box">
                                <h4 className="text-success" style={{ marginBottom: '0.5rem', fontSize: '0.9rem' }}>{t.simulationEstimates}</h4>
                                <div className="results-grid-small">
                                    <div>{t.yieldColonLabel}<strong>{simResults.predictions['Avg Yield']?.toFixed(2)} t/ha</strong></div>
                                    <div className="text-danger">{t.methaneColonLabel} <strong>{simResults.predictions['Methane Emissions']?.toFixed(1)} kg</strong></div>
                                    <div>{t.profitMarginColonLabel}<strong>{simResults.predictions['Profit Margin']?.toFixed(1)}%</strong></div>
                                    <div>
                                        {t.netIncomeColonLabel}{' '}
                                        <strong>
                                            {lang === 'vi'
                                                ? `${Math.round((simResults.predictions['Net Income'] ?? 0) * USD_TO_VND / 1000000).toLocaleString()} triệu VNĐ/ha`
                                                : `${simResults.predictions['Net Income']?.toFixed(0)} $/ha`}
                                        </strong>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <section className="glass-panel" style={{ textAlign: 'center' }}>
                <p style={{ color: 'var(--text-muted)', fontSize: '1rem', margin: 0 }}>
                    {t.viewDetailedDataAt}
                    <a
                        href="https://datastudio.google.com/s/nC82cbYUx7Q"
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: 'var(--primary)', textDecoration: 'underline' }}
                    >
                        {t.dataVisualizationLinkText}
                    </a>
                </p>
            </section>
        </div >
    );
}