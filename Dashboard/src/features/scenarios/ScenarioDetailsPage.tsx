import { useEffect, useState } from 'react'
import { getScrollBehavior } from '../../app/scrollBehavior'
import data from '../../data/scenario-details.json'
import type { Language } from '../../i18n'
import EmphasizedNumbers from '../../components/EmphasizedNumbers'
import { scenarioMetrics } from './scenarioTypes'
import type { ScenarioData, ScenarioFamily, ScenarioMetric } from './scenarioTypes'
import { scenarioMetricLabels, scenarioText } from './scenarioText'
import { relativeChange, scenarioSummary } from './scenarioAnalysis'
import '../../styles/scenarios.css'

const scenarios = data as ScenarioData
const families: ScenarioFamily[] = ['threeSeasons', 'twoSeasons', 'sustainable', 'oneMha']
const sections: { id: 'economics' | 'resources' | 'sustainability'; metrics: ScenarioMetric[] }[] = [
  { id: 'economics', metrics: ['income', 'straw', 'cost', 'labor', 'yield', 'margin', 'roi'] },
  { id: 'resources', metrics: ['water', 'fertilizer', 'pesticides'] },
  { id: 'sustainability', metrics: ['methane', 'intensity'] },
]

export default function ScenarioDetailsPage({ language }: { language: Language }) {
  const t = scenarioText[language]
  const [selectedCode, setSelectedCode] = useState('BAU-BV-OH-TH')
  const selected = scenarios.scenarios.find(({ code }) => code === selectedCode) ?? scenarios.scenarios[0]
  const currency = language === 'vi' ? 'VND' : 'USD'
  const current = selected[currency]
  const baseline = scenarios.baseline[currency]
  const baselineYears = `${scenarios.baselinePeriod.start}-${scenarios.baselinePeriod.end}`
  const number = new Intl.NumberFormat(language, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const percent = new Intl.NumberFormat(language, { maximumFractionDigits: 1 })
  const awd = current.withAwd === current.count ? 'with' : current.withoutAwd === current.count ? 'without' : 'mixed'

  useEffect(() => {
    document.getElementById(window.location.hash.slice(1) || 'scenario-details')?.scrollIntoView?.({ block: 'start', behavior: getScrollBehavior() })
  }, [])

  return (
    <div className="scenario-page page-shell" id="scenario-details">
      <section className="intro" aria-labelledby="scenario-title">
        <h1 id="scenario-title">{t.title}</h1>
      </section>
      <div className="scenario-selector">
        <label htmlFor="scenario-select">{t.select}</label>
        <div className="scenario-select-control">
          <span className="scenario-selected-name" aria-hidden="true">{selected.name[language]}</span>
          <select id="scenario-select" title={selected.name[language]} value={selected.code} onChange={(event) => setSelectedCode(event.target.value)}>{families.map((family) => <optgroup label={t[`group${family}`]} key={family}>{scenarios.scenarios.filter((scenario) => scenario.family === family).map((scenario) => <option value={scenario.code} key={scenario.code}>{scenario.name[language]}</option>)}</optgroup>)}</select>
        </div>
      </div>
      <aside className="scenario-summary" aria-label={t.summary} aria-live="polite"><p><EmphasizedNumbers text={scenarioSummary(current.values, baseline.values, language)} /></p></aside>
      {sections.map((section, index) => (
        <section className="scenario-section" id={`scenario-${section.id}`} aria-labelledby={`scenario-${section.id}-title`} key={section.id}>
          <h2 id={`scenario-${section.id}-title`}><span>{index + 1}.</span> {t[section.id]}</h2>
          <dl className={`scenario-kpis ${section.id === 'economics' ? 'economic-kpis' : ''}`}>
            {section.metrics.map((id) => {
              const metric = scenarioMetrics.find((item) => item.id === id)!
              const value = current.values[id]
              const change = relativeChange(value, baseline.values[id])
              const tone = change === null || Math.abs(change) < 0.000001 ? 'neutral' : (change > 0) === (metric.preferred === 'higher') ? 'good' : 'bad'
              const unit = metric.kind === 'money' ? currency === 'VND' ? 'VNĐ/ha' : '$/ha' : metric.kind === 'percentage' ? '%' : t[`${metric.kind}Unit`]
              const formatted = value === null ? '—' : metric.kind === 'money' && currency === 'VND' ? new Intl.NumberFormat(language, { maximumFractionDigits: 0 }).format(value) : number.format(value)
              return <div className="scenario-kpi" key={id}><dt title={id === 'roi' ? t.roiNote : undefined}>{scenarioMetricLabels[language][id]}</dt><dd className="scenario-kpi-value"><strong>{formatted}</strong><span>{unit}</span></dd><dd className="scenario-kpi-change">{change === null ? <span>{t.changeUnavailable}</span> : <><span className={`scenario-change ${tone}`}><span aria-hidden="true">{Math.abs(change) < 0.000001 ? '−' : change > 0 ? '↑' : '↓'}</span> {percent.format(Math.abs(change))}%</span><span>{t.comparedWith} ({baselineYears})</span></>}</dd></div>
            })}
            {section.id === 'sustainability' && <div className="scenario-kpi scenario-awd"><dt>{t.awd}</dt><dd className={`scenario-awd-value ${awd === 'without' ? 'without' : ''}`}>{awd === 'with' ? t.withAwd : awd === 'without' ? t.withoutAwd : `${t.mixedAwd} · ${percent.format(current.withAwd / current.count * 100)}%`}</dd><dd className="scenario-kpi-change">{t.period} {scenarios.period.start}–{scenarios.period.end}</dd></div>}
          </dl>
        </section>
      ))}
    </div>
  )
}
