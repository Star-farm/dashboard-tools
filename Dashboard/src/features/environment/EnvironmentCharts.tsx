import { useState } from 'react'
import type { Language } from '../../i18n'
import cached from '../../data/environment.json'
import EmphasizedNumbers from '../../components/EmphasizedNumbers'
import ScenarioComparisonChart from '../../components/ScenarioComparisonChart'
import { bau3Text } from '../economics/bau3Text'
import type { Bau3Family } from '../economics/bau3Types'
import { economicsText } from '../economics/economicsText'
import { environmentMetrics } from './environmentTypes'
import type { EnvironmentData, EnvironmentSeries } from './environmentTypes'
import { environmentAwdStats, environmentColors, environmentComparisonInsight, environmentDomain, environmentFamilyInsight, environmentFilteredSeries, environmentLinePoints, environmentNumber, environmentStats, environmentSummary, environmentUnit } from './environmentAnalysis'
import { environmentText } from './environmentText'
import { environmentRoutes } from './environmentRoutes'
import type { EnvironmentContentPage } from './environmentRoutes'
import EnvironmentBarChart from './EnvironmentBarChart'
import EnvironmentLineChart from './EnvironmentLineChart'

const data = cached as EnvironmentData
function Insight({ label, text, summary = false }: { label: string; text: string; summary?: boolean }) {
  return <aside className={`bau3-insight ${summary ? 'farming-summary' : 'farming-chart-insight'}`} aria-label={label}>{summary ? <h2>{label}</h2> : <h3>{label.split(' · ')[0]}</h3>}<p><EmphasizedNumbers text={text} /></p></aside>
}
function EnvironmentBars({ language }: { language: Language }) {
  const [climate, setClimate] = useState('all'), [resource, setResource] = useState('all')
  const t = environmentText[language], labels = economicsText[language]
  const series = environmentFilteredSeries(data, climate, resource)
  return <>
    <section className="comparison-filters" aria-label={t.filters}>
      <fieldset><legend>{labels.climate}</legend><div className="comparison-segmented">{['all', 'severe', 'mild'].map((value) => <button type="button" key={value} aria-pressed={climate === value} aria-label={value === 'all' ? t.allWeather : undefined} onClick={() => setClimate(value)}>{value === 'all' ? labels.all : labels[value as 'severe' | 'mild']}</button>)}</div></fieldset>
      <fieldset><legend>{labels.resource}</legend><div className="comparison-segmented">{['all', 'shortage', 'normal'].map((value) => <button type="button" key={value} aria-pressed={resource === value} aria-label={value === 'all' ? t.allResources : undefined} onClick={() => setResource(value)}>{value === 'all' ? labels.all : value === 'normal' ? t.normal : labels.shortage}</button>)}</div></fieldset>
      {(climate !== 'all' || resource !== 'all') && <button type="button" className="comparison-reset" onClick={() => { setClimate('all'); setResource('all') }}>{labels.reset}<span aria-hidden="true"> ↺</span></button>}
    </section>
    <div aria-live="polite"><Insight label={t.summary} text={environmentSummary(data, series, language, undefined, true)} summary /></div>
    <div className="farming-chart-grid environment-bar-grid">{environmentMetrics.map((metric) => <section className="farming-chart-section" key={metric} aria-labelledby={`environment-bar-${metric}-title`}>
      <EnvironmentBarChart data={data} series={series} metric={metric} language={language} />
      <Insight label={`${t.insight} · ${t[metric]}`} text={environmentComparisonInsight(data, series, metric, language)} />
    </section>)}</div>
  </>
}
function EnvironmentFarming({ family, language }: { family: Bau3Family; language: Language }) {
  const t = environmentText[language], selected = data.series.filter((item) => item.family === family)
  const awd = environmentAwdStats(selected, data.startYear, data.endYear)
  return <>
    <section className="farming-indicators" aria-labelledby="environment-kpis-title">
      <div className="farming-section-heading"><h2 id="environment-kpis-title">{t.indicators}</h2><p>{t.average} {data.startYear}–{data.endYear}</p></div>
      <dl className="scenario-kpis farming-kpis environment-kpis">{environmentMetrics.map((metric) => {
        const stats = environmentStats(selected, metric, data.startYear, data.endYear), change = stats.change
        const tone = change === null || Math.abs(change) < .000001 ? 'neutral' : change < 0 ? 'good' : 'bad'
        return <div className="scenario-kpi" key={metric}><dt>{t[metric]}</dt><dd className="scenario-kpi-value"><strong>{stats.mean === null ? '—' : environmentNumber(stats.mean, language)}</strong><span>{environmentUnit(metric, language)}</span></dd><dd className="scenario-kpi-change">{change === null ? t.noData : <><span className={`scenario-change ${tone}`}><span aria-hidden="true">{Math.abs(change) < .000001 ? '−' : change < 0 ? '↓' : '↑'}</span> {new Intl.NumberFormat(language, { maximumFractionDigits: 1 }).format(Math.abs(change))}%</span><span>{t.change}</span></>}</dd></div>
      })}<div className="scenario-kpi"><dt>{t.awd}</dt><dd className="scenario-kpi-value"><strong>{awd.mean === null ? '—' : environmentNumber(awd.mean, language)}</strong><span>%</span></dd><dd className="scenario-kpi-change">{awd.change === null ? t.noData : <><span className={`scenario-change ${Math.abs(awd.change) < .000001 ? 'neutral' : awd.change > 0 ? 'good' : 'bad'}`}><span aria-hidden="true">{Math.abs(awd.change) < .000001 ? '−' : awd.change > 0 ? '↑' : '↓'}</span> {new Intl.NumberFormat(language, { maximumFractionDigits: 1 }).format(Math.abs(awd.change))} {t.points}</span><span>{t.change}</span></>}</dd></div></dl><p className="farming-method">{t.method}</p>
    </section>
    <Insight label={t.summary} text={environmentSummary(data, selected, language, family)} summary />
    <section className="farming-trends" aria-labelledby="environment-trends-title"><h2 id="environment-trends-title">{t.trends}</h2><div className="farming-chart-grid">{environmentMetrics.map((metric) => <section className="farming-chart-section" key={metric} aria-labelledby={`environment-${metric}-${family}-title`}>
      <EnvironmentLineChart data={data} family={family} metric={metric} domain={environmentDomain(selected, metric)} language={language} title={t[metric]} />
      <Insight label={`${t.insight} · ${t[metric]}`} text={environmentFamilyInsight(data, family, metric, language)} />
    </section>)}</div></section>
  </>
}
function EnvironmentPair({ family, language }: { family: Exclude<Bau3Family, 'oneMha'>; language: Language }) {
  const t = environmentText[language], selected: EnvironmentSeries[] = data.series.filter((item) => item.family === family || item.family === 'oneMha')
  const labels = bau3Text[language], baselineLabel = { bau3s: labels.bau3Short, bau2s: labels.bau2Short, bauss: labels.baussShort }[family]
  return <>
    <Insight label={t.summary} text={environmentSummary(data, selected, language, family, true)} summary />
    <div className="bau3-sections">{environmentMetrics.map((metric) => <section className="bau3-section" key={metric} aria-labelledby={`environment-pair-${metric}-title`}>
      <h2 id={`environment-pair-${metric}-title`}>{t[metric]}</h2>
      <ScenarioComparisonChart key={family} language={language} title={t[metric]} baselineLabel={baselineLabel} baseline={environmentLinePoints(data, family, metric)} oneMha={environmentLinePoints(data, 'oneMha', metric)} startYear={data.startYear} endYear={data.endYear} domain={environmentDomain(selected, metric)} unit={environmentUnit(metric, language)} colors={environmentColors} formatValue={(value) => environmentNumber(value, language)} />
      <Insight label={`${t.insight} · ${t[metric]}`} text={environmentComparisonInsight(data, selected, metric, language, family)} />
    </section>)}</div>
  </>
}
export default function EnvironmentCharts({ page, language }: { page: Exclude<EnvironmentContentPage, 'environmentOverview'>; language: Language }) {
  const route = environmentRoutes[page]
  return route.kind === 'bars' ? <EnvironmentBars language={language} /> : route.kind === 'pair' ? <EnvironmentPair family={route.family} language={language} /> : <EnvironmentFarming family={route.family} language={language} />
}
