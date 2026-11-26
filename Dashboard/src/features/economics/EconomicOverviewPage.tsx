import { useDashboardFilters } from '../../app/useDashboardFilters'
import { mapContextRows } from '../../app/mapNavigation'
import PageDescription from '../../components/PageDescription'
import ScenarioAbbreviations from '../../components/ScenarioAbbreviations'
import { useEffect, useState } from 'react'
import AnalysisView from '../../components/AnalysisView'
import { getScrollBehavior } from '../../app/scrollBehavior'
import data from '../../data/economics-overview.json'
import type { Language } from '../../i18n'
import { economicMetrics, emptyEconomicFilters, filterEconomicRows } from './economicsData'
import type { EconomicRow } from './economicsData'
import { economicFacets, economicMetricUnits, economicsText } from './economicsText'
import ScenarioFilters from './ScenarioFilters'
import '../../styles/economics.css'

const rows = data as EconomicRow[]
type MetricComparison = { change: string; tone: '' | 'above' | 'below' }

export default function EconomicOverviewPage({ language }: { language: Language }) {
  const t = economicsText[language]
  const { filters, setFilters, scope } = useDashboardFilters()
  const scopedRows = mapContextRows(rows, scope)
  const visible = filterEconomicRows(scopedRows, filters).sort((a, b) => Number(b.historical) - Number(a.historical))
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(() => new Set())
  const filtered = Object.values(filters).some((value) => value !== 'all')
  const currency = language === 'vi' ? 'VND' : 'USD'
  const decimal = new Intl.NumberFormat(language, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const money = new Intl.NumberFormat(language, { minimumFractionDigits: language === 'vi' ? 0 : 2, maximumFractionDigits: language === 'vi' ? 0 : 2 })
  const percentage = new Intl.NumberFormat(language, { maximumFractionDigits: 1, signDisplay: 'exceptZero' })
  const unit = (metric: typeof economicMetrics[number]) => economicMetricUnits[metric] === '%' ? '%' : t[economicMetricUnits[metric] as 'moneyUnit' | 'yieldUnit' | 'laborUnit']
  const pivotMetrics = economicMetrics
  const pivotColumnCount = pivotMetrics.length + 2
  const baseline = scopedRows.find((row) => row.historical)
  const value = (row: EconomicRow, metric: typeof economicMetrics[number]) => {
    const amount = row[currency][metric]
    return amount === null ? '-' : (economicMetricUnits[metric] === 'moneyUnit' ? money : decimal).format(amount)
  }
  const metricComparison = (row: EconomicRow, metric: typeof pivotMetrics[number]): MetricComparison => {
    const amount = row[currency][metric]
    const baselineAmount = baseline?.[currency][metric]
    const difference = amount === null || baselineAmount == null ? null : amount - baselineAmount
    const preferredDirection = metric === 'cost' ? 'lower' : 'higher'
    const comparisonTone: MetricComparison['tone'] = difference === null || difference === 0
      ? ''
      : (preferredDirection === 'higher') === (difference > 0) ? 'above' : 'below'
    const change = amount === null || baselineAmount == null || baselineAmount === 0
      ? '—'
      : `${percentage.format((amount - baselineAmount) / baselineAmount * 100)}%`
    return { change, tone: comparisonTone }
  }
  const period = (row: EconomicRow) => `${row.historical ? `${t.historical} · ` : ''}${row.startYear}–${row.endYear}`
  const scenarioRows = visible.filter((row) => !row.historical)
  const scenarioGroups = scenarioRows.reduce<{ key: string; rows: EconomicRow[] }[]>((groups, row) => {
    const key = `${row.group}:${row.season}:${row.awd}`
    const current = groups.at(-1)
    if (current?.key === key) current.rows.push(row)
    else groups.push({ key, rows: [row] })
    return groups
  }, [])
  const toggleGroup = (key: string) => setCollapsedGroups((current) => {
    const next = new Set(current)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    return next
  })

  useEffect(() => {
    document.getElementById('economics-overview')?.scrollIntoView?.({ block: 'start', behavior: getScrollBehavior() })
  }, [])

  return (
    <div className="economics-page page-shell" id="economics-overview">
      <section className="intro" aria-labelledby="economics-title"><h1 id="economics-title">{t.title}</h1><PageDescription language={language} kind="overview" topic="economics" /></section>
      <AnalysisView language={language} config={{ topic: 'economics', kind: 'overview' }}>
      <ScenarioFilters rows={rows} filters={filters} onChange={setFilters} language={language} idPrefix="economic" />
      <div className="economic-results-toolbar">
        <p role="status"><strong>{visible.length}</strong> {t.scenario}</p>
        {filtered && visible.length > 0 && <button type="button" title={t.reset} className="economic-reset" onClick={() => setFilters(emptyEconomicFilters)}>{t.reset}<span aria-hidden="true"> ↺</span></button>}
      </div>
      {visible.length === 0 ? <div className="economic-empty"><h2>{t.noResults}</h2><p>{t.noResultsDescription}</p><button type="button" className="primary-button" onClick={() => setFilters(emptyEconomicFilters)}>{t.reset}</button></div> : <>
        <div className="economic-pivot">
        <div className="economic-table-region" role="region" aria-label={t.tableCaption} tabIndex={0}>
          <table className="economic-table economic-overview-table">
            <caption className="sr-only">{t.tableCaption}</caption>
            <colgroup><col className="economic-climate-column" /><col className="economic-resource-column" />{pivotMetrics.map((metric) => <col key={metric} className={`economic-${metric}-column${economicMetricUnits[metric] === 'moneyUnit' ? ' economic-money-column' : ''}`} />)}</colgroup>
            <thead>
              <tr className="economic-column-groups"><th scope="colgroup" colSpan={2}>{t.scenarioTableGroup}</th><th scope="colgroup" colSpan={5}>{t.financialColumns}</th><th scope="colgroup" colSpan={2}>{t.productionColumns}</th></tr>
              <tr><th scope="col">{t.climate}</th><th scope="col">{t.resourcesColumn}</th>{pivotMetrics.map((metric) => <th scope="col" key={metric} className="economic-numeric" title={metric === 'roi' ? t.roiNote : undefined}><span>{t[metric]}</span><small>{t.unit}: {unit(metric)}</small></th>)}</tr>
            </thead>
            {baseline && <tbody className="economic-baseline"><tr className="economic-baseline-label"><th colSpan={pivotColumnCount}>{t.referenceBaseline} · {period(baseline).replace(`${t.historical} · `, '')}</th></tr><tr>
              <th scope="row">{t[baseline.climate]}</th><td>{t[baseline.resource]}</td>
              {pivotMetrics.map((metric) => <td className="economic-numeric" key={metric}>{value(baseline, metric)}{unit(metric) === '%' ? '%' : ''}</td>)}
            </tr></tbody>}
            {scenarioGroups.map(({ key, rows: groupRows }) => {
              const first = groupRows[0]
              const collapsed = collapsedGroups.has(key)
              return <tbody key={key} className="economic-scenario-group"><tr className="economic-group-heading"><th colSpan={pivotColumnCount}><button type="button" aria-expanded={!collapsed} onClick={() => toggleGroup(key)}><span className="economic-pivot-group-title"><span className={`economic-group ${first.group}`}><ScenarioAbbreviations text={first.group === 'bau' ? t.pivotBau : t.pivotOneMha} language={language} /></span><span className="economic-group-separator">—</span><span>{t[first.season]}</span></span><small className="economic-pivot-group-awd">{t[first.awd]}</small></button></th></tr>
                {!collapsed && groupRows.map((row) => <tr key={row.code}><th scope="row">{t[row.climate]}</th><td>{t[row.resource]}</td>{pivotMetrics.map((metric) => {
                  const comparison = metricComparison(row, metric)
                  return <td className={`economic-numeric${comparison.tone ? ` economic-comparison-value ${comparison.tone}` : ''}`} key={metric}><span className="economic-metric-display"><span>{value(row, metric)}{unit(metric) === '%' ? '%' : ''}</span><small className="economic-comparison-change" title={t.changeFromBaseline} aria-label={`${t.changeFromBaseline}: ${comparison.change}`}>({comparison.change})</small></span></td>
                })}</tr>)}
              </tbody>
            })}
          </table>
        </div>
        </div>
        <div className="economic-income-legend" role="group" aria-label={t.comparisonLegend}><strong>{t.legendTitle}</strong><span><i className="economic-legend-swatch above" aria-hidden="true" />{t.betterThanBaseline}</span><span><i className="economic-legend-swatch below" aria-hidden="true" />{t.worseThanBaseline}</span></div>
        <section className="economic-cards" aria-label={t.mobileResults}>
          {visible.map((row) => <article className={`economic-card${row.historical ? ' economic-historical' : ''}`} key={`${row.code}-${row.historical}`}>
            <header><h2><span className={`economic-group ${row.group}`}>{t[row.group]}</span>{' '}<span>{t[row.season]}</span></h2><p className="economic-card-period">{period(row)}</p></header>
            <dl className="economic-card-facets">{economicFacets.slice(2).map(({ key }) => <div key={key}><dt>{t[key]}</dt><dd className={key === 'awd' ? `economic-awd ${row.awd}` : undefined}>{t[row[key]]}</dd></div>)}</dl>
            <dl className="economic-card-values">{economicMetrics.map((metric) => {
              const comparison = row.historical ? null : metricComparison(row, metric)
              return <div className={metric === 'income' ? 'economic-card-income' : undefined} key={metric}><dt>{t[metric]}</dt><dd><strong>{value(row, metric)}</strong><span>{unit(metric)}</span>{comparison && <small className={`economic-comparison-change${comparison.tone ? ` ${comparison.tone}` : ''}`} title={t.changeFromBaseline} aria-label={`${t.changeFromBaseline}: ${comparison.change}`}>({comparison.change})</small>}</dd></div>
            })}</dl>
          </article>)}
        </section>
      </>}
      </AnalysisView>
    </div>
  )
}
