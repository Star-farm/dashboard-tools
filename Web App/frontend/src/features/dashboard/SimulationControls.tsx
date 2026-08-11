import React, { type Dispatch, type SetStateAction } from 'react';
import type { Translation } from '../../i18n';
import type { KpiChangeResult, SimulationResult } from '../../types/dashboard';
import type { ScenarioGroup, SimulationInputs } from '../../api/dashboardApi';
import { SIMULATION_INPUT_LIMITS, USD_TO_VND } from './dashboardConfig';

interface SimulationControlsProps {
    t: Translation;
    language: 'vi' | 'en';
    scenarioGroup: ScenarioGroup;
    setScenarioGroup: Dispatch<SetStateAction<ScenarioGroup>>;
    inputs: SimulationInputs;
    setInputs: Dispatch<SetStateAction<SimulationInputs>>;
    results: SimulationResult | null;
    currentKpis: KpiChangeResult | null;
    loading: boolean;
    runSimulation: () => Promise<void>;
}

function TooltipLines({ lines }: { lines: string[] }) {
    return lines.map((line, index) => (
        <React.Fragment key={line}>
            • {line}
            {index < lines.length - 1 && <br />}
        </React.Fragment>
    ));
}

export function SimulationControls({
    t,
    language,
    scenarioGroup,
    setScenarioGroup,
    inputs,
    setInputs,
    results,
    currentKpis,
    loading,
    runSimulation,
}: SimulationControlsProps) {
    const simulationEstimatesTitle = t.simulationEstimates
        .replace('{targetYear}', String(currentKpis?.target_year ?? 2050))
        .replace('{baseYear}', String(currentKpis?.base_year ?? 2022));

    return (
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
                                        <span className="tooltip-desc"><TooltipLines lines={t.bauTooltipDesc} /></span>
                                    </li>
                                    <li className="tooltip-item">
                                        <span className="tooltip-title">{t.omrh}</span>
                                        <span className="tooltip-desc"><TooltipLines lines={t.omrhTooltipItems} /></span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </label>
                    <select className="select-input" value={scenarioGroup} onChange={(event) => setScenarioGroup(event.target.value as ScenarioGroup)}>
                        <option value="Business As Usual">{t.bau}</option>
                        <option value="One Million Hectare Rice">{t.omrh}</option>
                    </select>
                </div>

                <div className="slider-item">
                    <label className="filter-label">{t.awdAdoptionPractice}</label>
                    <select className="select-input" value={inputs.awd_adoption} onChange={(event) => setInputs((current) => ({ ...current, awd_adoption: event.target.value }))}>
                        <option value="With AWD">{t.awd}</option>
                        <option value="Without AWD">{t.noawd}</option>
                    </select>
                </div>

                <RangeControl label={t.fertilizerUsage} description={t.fertilizerTooltipDesc} value={inputs.fertilizer_usage} unit={t.fertilizerUnit} limits={SIMULATION_INPUT_LIMITS.fertilizer_usage} onChange={(value) => setInputs((current) => ({ ...current, fertilizer_usage: value }))} />
                <RangeControl label={t.pesticideUsage} description={t.pesticideTooltipDesc} value={inputs.pesticide_usage} unit={t.pesticideUnit} limits={SIMULATION_INPUT_LIMITS.pesticide_usage} onChange={(value) => setInputs((current) => ({ ...current, pesticide_usage: value }))} />
                <RangeControl label={t.waterUsage} description={t.waterTooltipDesc} value={inputs.water_usage} unit={t.waterUnit} limits={SIMULATION_INPUT_LIMITS.water_usage} onChange={(value) => setInputs((current) => ({ ...current, water_usage: value }))} />

                <button className="btn" style={{ width: '100%', marginTop: '0.5rem' }} onClick={() => void runSimulation()} disabled={loading}>
                    {loading ? <span className="spinner-text">(o)</span> : t.simulateButton}
                </button>

                {results && (
                    <div className="simulation-estimates-box">
                        <h4 style={{ marginBottom: '0.5rem', fontSize: '0.9rem', color: '#000' }}>{simulationEstimatesTitle}</h4>
                        <div className="results-grid-small">
                            <SimulationEstimate label={t.yieldColonLabel} metric="Avg Yield" value={results.predictions['Avg Yield']} currentKpis={currentKpis} displayValue={`${results.predictions['Avg Yield']?.toFixed(2)} ${t.yieldUnit}`} />
                            <SimulationEstimate label={t.methaneColonLabel} metric="Methane Emissions" value={results.predictions['Methane Emissions']} currentKpis={currentKpis} lowerIsBetter displayValue={`${results.predictions['Methane Emissions']?.toFixed(1)} ${t.methaneUnit}`} />
                            <SimulationEstimate label={t.profitMarginColonLabel} metric="Profit Margin" value={results.predictions['Profit Margin']} currentKpis={currentKpis} displayValue={`${results.predictions['Profit Margin']?.toFixed(1)}%`} />
                            <SimulationEstimate label={t.netIncomeColonLabel} metric="Net Income" value={results.predictions['Net Income']} currentKpis={currentKpis} displayValue={language === 'vi'
                                ? `${((results.predictions['Net Income'] ?? 0) * USD_TO_VND / 1_000_000).toLocaleString('vi-VN', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} ${t.netIncomeVndUnit}`
                                : `${results.predictions['Net Income']?.toFixed(0)} ${t.netIncomeUsdUnit}`} />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

interface SimulationEstimateProps {
    label: string;
    metric: keyof SimulationResult['predictions'];
    value: number | undefined;
    displayValue: string;
    currentKpis: KpiChangeResult | null;
    lowerIsBetter?: boolean;
}

function SimulationEstimate({ label, metric, value, displayValue, currentKpis, lowerIsBetter = false }: SimulationEstimateProps) {
    const currentValue = currentKpis?.kpis?.[metric]?.base_value;
    const percentage = value != null && currentValue != null && currentValue !== 0
        ? ((value - currentValue) / currentValue) * 100
        : null;
    const isGood = percentage != null && (lowerIsBetter ? percentage < 0 : percentage > 0);
    const colorClass = percentage == null || percentage === 0 ? '' : isGood ? 'text-success' : 'text-danger';
    const sign = percentage != null && percentage > 0 ? '+' : '';

    return (
        <div className={colorClass}>
            {label}<strong>{displayValue}</strong>
            {percentage != null && (
                <span className="simulation-change">({sign}{percentage.toFixed(1)}%)</span>
            )}
        </div>
    );
}

interface RangeControlProps {
    label: string;
    description: string;
    value: number;
    unit: string;
    limits: { min: number; max: number; step: number };
    onChange: (value: number) => void;
}

function RangeControl({ label, description, value, unit, limits, onChange }: RangeControlProps) {
    return (
        <div className="slider-item">
            <div className="slider-label-row">
                <span className="name">
                    {label}
                    <div className="info-tooltip-container">
                        <span className="info-icon">?</span>
                        <div className="info-tooltip-content"><span className="tooltip-desc">{description}</span></div>
                    </div>
                </span>
                <span className="value">{value} {unit}</span>
            </div>
            <input type="range" aria-label={label} min={limits.min} max={limits.max} step={limits.step} value={value} onChange={(event) => onChange(Number(event.target.value))} />
        </div>
    );
}
