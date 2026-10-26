import { useEffect, useState } from 'react'
import type { Language } from '../../i18n'
import { getScrollBehavior } from '../../app/scrollBehavior'
import cached from '../../data/resources.json'
import EmphasizedNumbers from '../../components/EmphasizedNumbers'
import ScenarioComparisonChart from '../../components/ScenarioComparisonChart'
import { bau3Text } from '../economics/bau3Text'
import type { Bau3Family } from '../economics/bau3Types'
import { economicsText } from '../economics/economicsText'
import { resourceMetrics } from './resourceTypes'
import type { ResourceData, ResourceSeries } from './resourceTypes'
import { resourceColors, resourceComparisonInsight, resourceDomain, resourceFamilyInsight, resourceFilteredSeries, resourceLinePoints, resourceNumber, resourceStats, resourceSummary, resourceUnit } from './resourceAnalysis'
import { resourceText } from './resourceText'
import { resourcePageTitle, resourceRoutes } from './resourceRoutes'
import type { ResourceContentPage } from './resourceRoutes'
import ResourceOverview from './ResourceOverview'
import ResourceBarChart from './ResourceBarChart'
import ResourceLineChart from './ResourceLineChart'
import '../../styles/economics.css'
import '../../styles/economic-comparison.css'
import '../../styles/scenarios.css'
import '../../styles/bau3-comparison.css'
import '../../styles/bau-farming.css'
import '../../styles/resources.css'

const data = cached as ResourceData
function Insight({ label, text, summary = false }: { label: string; text: string; summary?: boolean }) {
  return <aside className={`bau3-insight ${summary ? 'farming-summary' : 'farming-chart-insight'}`} aria-label={label}>{summary ? <h2>{label}</h2> : <h3>{label.split(' · ')[0]}</h3>}<p><EmphasizedNumbers text={text} /></p></aside>
}
function ResourceBars({ language }: { language: Language }) {
  const [climate, setClimate] = useState('all'), [resource, setResource] = useState('all')
  const t = resourceText[language], labels = economicsText[language]
  const series = resourceFilteredSeries(data, climate, resource)
  return <>
    <section className="comparison-filters" aria-label={t.filters}>
      <fieldset><legend>{labels.climate}</legend><div className="comparison-segmented">{['all', 'severe', 'mild'].map((value) => <button type="button" key={value} aria-pressed={climate === value} aria-label={value === 'all' ? t.allWeather : undefined} onClick={() => setClimate(value)}>{value === 'all' ? labels.all : labels[value as 'severe' | 'mild']}</button>)}</div></fieldset>
      <fieldset><legend>{labels.resource}</legend><div className="comparison-segmented">{['all', 'shortage', 'normal'].map((value) => <button type="button" key={value} aria-pressed={resource === value} aria-label={value === 'all' ? t.allResources : undefined} onClick={() => setResource(value)}>{value === 'all' ? labels.all : value === 'normal' ? t.normal : labels.shortage}</button>)}</div></fieldset>
      {(climate !== 'all' || resource !== 'all') && <button type="button" className="comparison-reset" onClick={() => { setClimate('all'); setResource('all') }}>{labels.reset}<span aria-hidden="true"> ↺</span></button>}
    </section>
    <div aria-live="polite"><Insight label={t.summary} text={resourceSummary(data, series, language, undefined, true)} summary /></div>
    <div className="farming-chart-grid resource-bar-grid">{resourceMetrics.map((metric) => <section className="farming-chart-section" key={metric} aria-labelledby={`resource-bar-${metric}-title`}>
      <ResourceBarChart data={data} series={series} metric={metric} language={language} />
      <Insight label={`${t.insight} · ${t[metric]}`} text={resourceComparisonInsight(data, series, metric, language)} />
    </section>)}</div>
  </>
}
function ResourceFarming({ family, language }: { family: Bau3Family; language: Language }) {
  const t = resourceText[language], selected = data.series.filter((item) => item.family === family)
  return <>
    <section className="farming-indicators" aria-labelledby="resource-kpis-title">
      <div className="farming-section-heading"><h2 id="resource-kpis-title">{t.indicators}</h2><p>{t.average} {data.startYear}–{data.endYear}</p></div>
      <dl className="scenario-kpis farming-kpis resource-kpis">{resourceMetrics.map((metric) => {
        const stats = resourceStats(selected, metric, data.startYear, data.endYear), change = stats.change
        const tone = change === null || Math.abs(change) < .000001 ? 'neutral' : change < 0 ? 'good' : 'bad'
        return <div className="scenario-kpi" key={metric}><dt>{t[metric]}</dt><dd className="scenario-kpi-value"><strong>{stats.mean === null ? '—' : resourceNumber(stats.mean, language)}</strong><span>{resourceUnit(metric, language)}</span></dd><dd className="scenario-kpi-change">{change === null ? t.noData : <><span className={`scenario-change ${tone}`}><span aria-hidden="true">{Math.abs(change) < .000001 ? '−' : change < 0 ? '↓' : '↑'}</span> {new Intl.NumberFormat(language, { maximumFractionDigits: 1 }).format(Math.abs(change))}%</span><span>{t.change}</span></>}</dd></div>
      })}</dl><p className="farming-method">{t.method}</p>
    </section>
    <Insight label={t.summary} text={resourceSummary(data, selected, language, family)} summary />
    <section className="farming-trends" aria-labelledby="resource-trends-title"><h2 id="resource-trends-title">{t.trends}</h2><div className="farming-chart-grid">{resourceMetrics.map((metric) => <section className="farming-chart-section" key={metric} aria-labelledby={`resource-${metric}-${family}-title`}>
      <ResourceLineChart data={data} family={family} metric={metric} domain={resourceDomain(selected, metric)} language={language} title={t[metric]} />
      <Insight label={`${t.insight} · ${t[metric]}`} text={resourceFamilyInsight(data, family, metric, language)} />
    </section>)}</div></section>
  </>
}
function ResourcePair({ family, language }: { family: Exclude<Bau3Family, 'oneMha'>; language: Language }) {
  const t = resourceText[language], selected: ResourceSeries[] = data.series.filter((item) => item.family === family || item.family === 'oneMha')
  const labels = bau3Text[language], baselineLabel = { bau3s: labels.bau3Short, bau2s: labels.bau2Short, bauss: labels.baussShort }[family]
  return <>
    <Insight label={t.summary} text={resourceSummary(data, selected, language, family, true)} summary />
    <div className="bau3-sections">{resourceMetrics.map((metric) => <section className="bau3-section" key={metric} aria-labelledby={`resource-pair-${metric}-title`}>
      <h2 id={`resource-pair-${metric}-title`}>{t[metric]}</h2>
      <ScenarioComparisonChart key={family} language={language} title={t[metric]} baselineLabel={baselineLabel} baseline={resourceLinePoints(data, family, metric)} oneMha={resourceLinePoints(data, 'oneMha', metric)} startYear={data.startYear} endYear={data.endYear} domain={resourceDomain(selected, metric)} unit={resourceUnit(metric, language)} colors={resourceColors} formatValue={(value) => resourceNumber(value, language)} />
      <Insight label={`${t.insight} · ${t[metric]}`} text={resourceComparisonInsight(data, selected, metric, language, family)} />
    </section>)}</div>
  </>
}
export default function ResourcesPage({ page, language }: { page: ResourceContentPage; language: Language }) {
  const route = resourceRoutes[page]
  useEffect(() => { document.getElementById(route.anchor)?.scrollIntoView?.({ block: 'start', behavior: getScrollBehavior() }) }, [route.anchor])
  return <div className={`resources-page economics-page bau3-page page-shell${route.kind === 'farming' ? ' bau-farming-page' : ''}`} id={route.anchor}>
    <section className={`intro${route.kind === 'farming' || route.kind === 'pair' ? ' bau3-intro' : ''}`} aria-labelledby="resources-title"><h1 id="resources-title">{resourcePageTitle(page, language)}</h1>{(route.kind === 'farming' || route.kind === 'pair') && <span>{data.startYear}–{data.endYear}</span>}</section>
    {route.kind === 'overview' ? <ResourceOverview data={data} language={language} /> : route.kind === 'bars' ? <ResourceBars language={language} /> : route.kind === 'pair' ? <ResourcePair family={route.family} language={language} /> : <ResourceFarming family={route.family} language={language} />}
  </div>
}
