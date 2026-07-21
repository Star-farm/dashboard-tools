import React, { useState } from 'react';
import {
    ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, LabelList
} from 'recharts';
import { ReferenceLine } from 'recharts';
import {
    useDashboardData, USD_TO_VND, SCENARIO_COLORS, SCENARIO_KEYS,
    SIMULATION_INPUT_LIMITS,
} from '../../hooks/useDashboardData';

export const detectBrowserLang = (nav = typeof navigator !== 'undefined' ? navigator : null): 'vi' | 'en' => {
    const browserLang = nav ? nav.language : '';
    return browserLang.toLowerCase().startsWith('vi') ? 'vi' : 'en';
};

export function Dashboard() {
    const [lang, setLang] = useState<'vi' | 'en'>(detectBrowserLang());
    const getMetricLabel = (key: string) => {
        switch (key) {
            case 'Avg Yield': return t.avgYield;
            case 'Methane Emissions': return t.methaneEmissions;
            case 'Net Income': return t.netIncome;
            case 'Emission Intensity': return t.emissionIntensity;
            default: return key;
        }
    };
    const getScenarioLabel = (key: string) => {
        switch (key) {
            case 'Business As Usual': return t.bau;
            case 'One Million Hectare Rice': return t.omrh;
            default: return t.simulatedLabel;
        }
    };
    const formatIndicatorTick = (tick: unknown) => getMetricLabel(String(tick ?? ''));
    const {
        t, isInitialLoading,
        kpiChange, loadingKpi,
        loadingBar,
        simScenarioGroup, setSimScenarioGroup, simInputs, setSimInputs, simResults, loadingSim,
        isMobile,
        isVndNetIncome,
        economicChart, environmentChart,
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
                        const displayVal = isVnd ? Math.round(entry.target_value * USD_TO_VND / 1000000) : entry.target_value;
                        const displayUnit = isVnd ? 'triệu VNĐ/ha' : cfg.unit;
                        return (
                            <> &middot; {t.kpiTargetYear}: {displayVal.toLocaleString(undefined, { maximumFractionDigits: 0 })} {displayUnit}</>
                        );
                    })()}
                </span>
            </div>
        );
    };

    // Phần nội dung biểu đồ (col-8)
    const chartsContent = (
        <div className="col-8" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {[
                { chart: economicChart, title: t.economicGroup },
                { chart: environmentChart, title: t.environmentGroup },
            ].map(({ chart, title }) => (
                <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column' }} key={title}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                        <h2>{title}</h2>
                    </div>
                    {isVndNetIncome && chart === economicChart && (
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '-0.5rem', marginBottom: '0.75rem' }}>
                            {t.exchangeRateNote}
                        </p>
                    )}
                    <div className="chart-container-height" style={{ height: isMobile ? 420 : 380 }}>
                        {loadingBar ? (
                            <div className="centered-fallback">
                                <span className="spinner-text">(o)</span>
                                <span style={{ marginLeft: '0.5rem' }}>{t.loading}</span>
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                    data={chart.data}
                                    margin={{ top: 20, right: isMobile ? 10 : 20, left: isMobile ? 0 : 10, bottom: isMobile ? 40 : 10 }}
                                >
                                    <XAxis
                                        dataKey="indicator"
                                        stroke="#000000ff"
                                        interval={0}
                                        textAnchor="middle"
                                        height={isMobile ? 40 : 40}
                                        tick={{ fontSize: isMobile ? 9 : 12 }}
                                        tickFormatter={formatIndicatorTick}
                                    />
                                    <YAxis
                                        yAxisId="left"
                                        domain={chart.leftDomain}
                                        ticks={chart.leftTicks}
                                        tick={{ fontSize: isMobile ? 10 : 12 }}
                                        width={isMobile ? 36 : 55}
                                        label={isMobile ? undefined : { value: chart.left.unit, angle: -90, position: 'insideLeft', fontSize: 12, offset: 5 }}
                                    />
                                    <YAxis
                                        yAxisId="right"
                                        orientation="right"
                                        domain={chart.rightDomain}
                                        ticks={chart.rightTicks}
                                        tick={{ fontSize: isMobile ? 10 : 12 }}
                                        width={isMobile ? 36 : 55}
                                        label={isMobile ? undefined : { value: chart.right.unit, angle: 90, position: 'insideRight', fontSize: 12, offset: 5 }}
                                    />
                                    <ReferenceLine yAxisId="right" y={0} stroke="#9ca3af" strokeWidth={1.5} strokeDasharray="4 4" />
                                    <Tooltip
                                        contentStyle={{ background: '#FFFFFF', border: '1px solid var(--panel-border)', borderRadius: '8px' }}
                                        labelFormatter={formatIndicatorTick}
                                        formatter={(value: unknown, name: unknown, item: any) => {
                                            const numValue = Number(value ?? 0);
                                            const nameStr = String(name ?? '');
                                            const dataKey = String(item?.dataKey ?? '');
                                            const unit = dataKey.endsWith('_right') ? chart.right.unit : chart.left.unit;
                                            return [`${numValue.toLocaleString()}${unit ? ` ${unit}` : ''}`, nameStr];
                                        }}
                                    />
                                    <Legend wrapperStyle={{ fontSize: isMobile ? '11px' : '13px', paddingTop: isMobile ? 8 : 0 }} />
                                    {SCENARIO_KEYS.map(scenario => (
                                        <React.Fragment key={scenario}>
                                            <Bar
                                                yAxisId="left"
                                                dataKey={`${scenario}_left`}
                                                name={getScenarioLabel(scenario)}
                                                fill={SCENARIO_COLORS[scenario]}
                                                radius={[4, 4, 0, 0]}
                                                stackId={scenario}
                                            >
                                                <LabelList dataKey={`${scenario}_left`} position="top" fill={SCENARIO_COLORS[scenario]} style={{ fontSize: isMobile ? '9px' : '11px', fontWeight: 'bold' }}
                                                    formatter={(value: unknown) => value != null && Number(value) !== 0 ? Number(value).toLocaleString() : ''} />
                                            </Bar>
                                            <Bar
                                                yAxisId="right"
                                                dataKey={`${scenario}_right`}
                                                name={getScenarioLabel(scenario)}
                                                fill={SCENARIO_COLORS[scenario]}
                                                radius={[4, 4, 0, 0]}
                                                legendType="none"
                                                isAnimationActive={false}
                                                stackId={scenario}
                                            >
                                                <LabelList dataKey={`${scenario}_right`} position="top" fill={SCENARIO_COLORS[scenario]} style={{ fontSize: isMobile ? '9px' : '11px', fontWeight: 'bold' }}
                                                    formatter={(value: unknown) => value != null && Number(value) !== 0 ? Number(value).toLocaleString() : ''} />
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

    // Phần nội dung điều khiển mô phỏng (col-4)
    const controlsContent = (
        <div className="glass-panel col-4" style={{ display: 'flex', flexDirection: 'column' }}>
            <h2>{t.inputSimulationControls}</h2>
            <div className="slider-group" style={{ marginTop: '1rem' }}>
                <div className="slider-item">
                    <label className="filter-label">
                        {t.simulatedGroup}
                        <div className="info-tooltip-container">
                            <span className="info-icon">?</span>
                            <div className="info-tooltip-content">
                                <ul className="tooltip-list">
                                    <li className="tooltip-item">
                                        <span className="tooltip-title">{t.bau}</span>
                                        <span className="tooltip-desc">
                                            {t.bauTooltipDesc.map((line: string, i: number) => (
                                                <React.Fragment key={i}>
                                                    • {line}
                                                    {i < t.bauTooltipDesc.length - 1 && <br />}
                                                </React.Fragment>
                                            ))}
                                        </span>
                                    </li>
                                    <li className="tooltip-item">
                                        <span className="tooltip-title">{t.omrh}</span>
                                        <span className="tooltip-desc">
                                            {t.omrhTooltipItems.map((line: string, i: number) => (
                                                <React.Fragment key={i}>
                                                    • {line}
                                                    {i < t.omrhTooltipItems.length - 1 && <br />}
                                                </React.Fragment>
                                            ))}
                                        </span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </label>
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
                        <span className="name">
                            {t.fertilizerUsage}
                            <div className="info-tooltip-container">
                                <span className="info-icon">?</span>
                                <div className="info-tooltip-content">
                                    <span className="tooltip-desc">{t.fertilizerTooltipDesc}</span>
                                </div>
                            </div>
                        </span>
                        <span className="value">{simInputs.fertilizer_usage} kg/ha</span>
                    </div>
                    <input type="range" aria-label={t.fertilizerUsage}
                        min={SIMULATION_INPUT_LIMITS.fertilizer_usage.min}
                        max={SIMULATION_INPUT_LIMITS.fertilizer_usage.max}
                        step={SIMULATION_INPUT_LIMITS.fertilizer_usage.step}
                        value={simInputs.fertilizer_usage}
                        onChange={(e) => setSimInputs(prev => ({ ...prev, fertilizer_usage: Number(e.target.value) }))} />
                </div>

                <div className="slider-item">
                    <div className="slider-label-row">
                        <span className="name">
                            {t.pesticideUsage}
                            <div className="info-tooltip-container">
                                <span className="info-icon">?</span>
                                <div className="info-tooltip-content">
                                    <span className="tooltip-desc">{t.pesticideTooltipDesc}</span>
                                </div>
                            </div>
                        </span>
                        <span className="value">{simInputs.pesticide_usage} kg/ha</span>
                    </div>
                    <input type="range" aria-label={t.pesticideUsage}
                        min={SIMULATION_INPUT_LIMITS.pesticide_usage.min}
                        max={SIMULATION_INPUT_LIMITS.pesticide_usage.max}
                        step={SIMULATION_INPUT_LIMITS.pesticide_usage.step}
                        value={simInputs.pesticide_usage}
                        onChange={(e) => setSimInputs(prev => ({ ...prev, pesticide_usage: Number(e.target.value) }))} />
                </div>

                <div className="slider-item">
                    <div className="slider-label-row">
                        <span className="name">
                            {t.waterUsage}
                            <div className="info-tooltip-container">
                                <span className="info-icon">?</span>
                                <div className="info-tooltip-content">
                                    <span className="tooltip-desc">{t.waterTooltipDesc}</span>
                                </div>
                            </div>
                        </span>
                        <span className="value">{simInputs.water_usage} m³/ha</span>
                    </div>
                    <input type="range" aria-label={t.waterUsage}
                        min={SIMULATION_INPUT_LIMITS.water_usage.min}
                        max={SIMULATION_INPUT_LIMITS.water_usage.max}
                        step={SIMULATION_INPUT_LIMITS.water_usage.step}
                        value={simInputs.water_usage}
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
    );

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
                {/* Thay đổi thứ tự hiển thị dựa trên biến isMobile */}
                {isMobile ? (
                    <>
                        {controlsContent}
                        {chartsContent}
                    </>
                ) : (
                    <>
                        {chartsContent}
                        {controlsContent}
                    </>
                )}
            </div>

            <section className="glass-panel data-cta-panel">
                <p className="data-cta-text">{t.viewDetailedDataAt}</p>

                <a href="https://datastudio.google.com/s/nC82cbYUx7Q"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn data-cta-btn"
                >
                    {t.dataVisualizationLinkText}
                </a>
            </section>

            <footer className="app-footer">
                <div className="footer-inner">
                    <div className="footer-about">
                        <h3 className="footer-project-name">{t.footerProjectName}</h3>
                        <p className="footer-tagline">{t.footerTagline}</p>
                        <p className="footer-description">{t.footerDescription}</p>
                        <p className="footer-partof">{t.footerPartOf}</p>
                    </div>

                    <div className="footer-links">
                        <h4>{t.footerLinks}</h4>
                        <ul>
                            <li>
                                <a href="https://datastudio.google.com/s/nC82cbYUx7Q" target="_blank" rel="noopener noreferrer">
                                    {t.footerDataVisualization}
                                </a>
                            </li>
                            <li>
                                <a href="https://github.com/Star-farm/Star-farm-models" target="_blank" rel="noopener noreferrer">
                                    {t.footerDocumentation}
                                </a>
                            </li>
                            <li>
                                <a href="https://across-lab.org/" target="_blank" rel="noopener noreferrer">
                                    {t.aboutus}
                                </a>
                            </li>
                        </ul>
                    </div>
                </div>

                <div className="footer-bottom">
                    <span>© {new Date().getFullYear()} {t.footerProjectName} · {t.footerRights}</span>
                </div>
            </footer>
        </div>
    );
}
