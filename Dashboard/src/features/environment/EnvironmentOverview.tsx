import { useState } from 'react'
import { useDashboardFilters } from '../../app/useDashboardFilters'
import { mapContextRows } from '../../app/mapNavigation'
import type { Language } from '../../i18n'
import ScenarioAbbreviations from '../../components/ScenarioAbbreviations'
import { emptyEconomicFilters, filterEconomicRows } from '../economics/economicsData'
import { economicFacets, economicsText } from '../economics/economicsText'
import ScenarioFilters from '../economics/ScenarioFilters'
import { environmentMetrics } from './environmentTypes'
import type { EnvironmentData, EnvironmentMetric, EnvironmentRow } from './environmentTypes'
import { environmentNumber, environmentUnit } from './environmentAnalysis'
import { environmentText } from './environmentText'

type MetricComparison = { change: string; tone: '' | 'above' | 'below' }

export default function EnvironmentOverview({ data, language }: { data: Pick<EnvironmentData, 'rows'>; language: Language }) {
  const { filters, setFilters, scope } = useDashboardFilters()
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(() => new Set())
  const t = economicsText[language], text = environmentText[language]
  const scopedRows = mapContextRows(data.rows, scope)
  const visible = filterEconomicRows(scopedRows, filters).sort((a, b) => Number(b.historical) - Number(a.historical))
  const filtered = Object.values(filters).some((value) => value !== 'all')
  const pivotColumnCount = environmentMetrics.length + 2
  const baseline = scopedRows.find((row) => row.historical)
  const percentage = new Intl.NumberFormat(language, { maximumFractionDigits: 1, signDisplay: 'exceptZero' })
  const value = (row: EnvironmentRow, metric: EnvironmentMetric) => row.values[metric] === null ? '-' : environmentNumber(row.values[metric], language)
  const metricComparison = (row: EnvironmentRow, metric: EnvironmentMetric): MetricComparison => {
    const amount = row.values[metric]
    const baselineAmount = baseline?.values[metric]
    const difference = amount === null || baselineAmount == null ? null : amount - baselineAmount
    const tone: MetricComparison['tone'] = difference === null || difference === 0 ? '' : difference < 0 ? 'above' : 'below'
    const change = amount === null || baselineAmount == null || baselineAmount === 0
      ? '—'
      : `${percentage.format((amount - baselineAmount) / baselineAmount * 100)}%`
    return { change, tone }
  }
  const period = (row: EnvironmentRow) => `${row.historical ? `${t.historical} · ` : ''}${row.startYear}–${row.endYear}`
  const scenarioRows = visible.filter((row) => !row.historical)
  const scenarioGroups = scenarioRows.reduce<{ key: string; rows: EnvironmentRow[] }[]>((groups, row) => {
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

  return <>
    <ScenarioFilters rows={data.rows} filters={filters} onChange={setFilters} language={language} idPrefix="environment-filter" />
    <div className="economic-results-toolbar">
      <p role="status"><strong>{visible.length}</strong> {t.scenario}</p>
      {filtered && visible.length > 0 && <button type="button" title={t.reset} className="economic-reset" onClick={() => setFilters(emptyEconomicFilters)}>{t.reset}<span aria-hidden="true"> ↻</span></button>}
    </div>
    {visible.length === 0 ? <div className="economic-empty"><h2>{t.noResults}</h2><p>{t.noResultsDescription}</p><button type="button" className="primary-button" onClick={() => setFilters(emptyEconomicFilters)}>{t.reset}</button></div> : <>
      <div className="economic-pivot">
        <div className="economic-table-region" role="region" aria-label={text.table} tabIndex={0}>
          <table className="economic-table economic-overview-table environment-overview-table">
            <caption className="sr-only">{text.table}</caption>
            <colgroup><col className="economic-climate-column" /><col className="economic-resource-column" />{environmentMetrics.map((metric) => <col key={metric} className={`economic-${metric}-column`} />)}</colgroup>
            <thead>
              <tr className="economic-column-groups"><th scope="colgroup" colSpan={2}>{t.scenarioTableGroup}</th><th scope="colgroup" colSpan={environmentMetrics.length}>{text.indicators}</th></tr>
              <tr><th scope="col">{t.climate}</th><th scope="col">{t.resourcesColumn}</th>{environmentMetrics.map((metric) => <th scope="col" key={metric} className="economic-numeric"><span>{text[metric]}</span><small>{text.unit}: {environmentUnit(metric, language)}</small></th>)}</tr>
            </thead>
            {baseline && <tbody className="economic-baseline"><tr className="economic-baseline-label"><th colSpan={pivotColumnCount}>{t.referenceBaseline} · {period(baseline).replace(`${t.historical} · `, '')}</th></tr><tr>
              <th scope="row">{t[baseline.climate]}</th><td>{t[baseline.resource]}</td>
              {environmentMetrics.map((metric) => <td className="economic-numeric" key={metric}>{value(baseline, metric)}</td>)}
            </tr></tbody>}
            {scenarioGroups.map(({ key, rows: groupRows }) => {
              const first = groupRows[0]
              const collapsed = collapsedGroups.has(key)
              return <tbody key={key} className="economic-scenario-group"><tr className="economic-group-heading"><th colSpan={pivotColumnCount}><button type="button" aria-expanded={!collapsed} onClick={() => toggleGroup(key)}><span className="economic-pivot-group-title"><span className={`economic-group ${first.group}`}><ScenarioAbbreviations text={first.group === 'bau' ? t.pivotBau : t.pivotOneMha} language={language} /></span><span className="economic-group-separator">—</span><span>{t[first.season]}</span></span><small className="economic-pivot-group-awd">{t[first.awd]}</small></button></th></tr>
                {!collapsed && groupRows.map((row) => <tr key={row.code}><th scope="row">{t[row.climate]}</th><td>{t[row.resource]}</td>{environmentMetrics.map((metric) => {
                  const comparison = metricComparison(row, metric)
                  return <td className={`economic-numeric${comparison.tone ? ` economic-comparison-value ${comparison.tone}` : ''}`} key={metric}><span className="economic-metric-display"><span>{value(row, metric)}</span><small className={`economic-comparison-change${comparison.tone ? ` ${comparison.tone}` : ''}`} title={t.changeFromBaseline} aria-label={`${t.changeFromBaseline}: ${comparison.change}`}>({comparison.change})</small></span></td>
                })}</tr>)}
              </tbody>
            })}
          </table>
        </div>
      </div>
      <div className="economic-income-legend" role="group" aria-label={t.comparisonLegend}><strong>{t.legendTitle}</strong><span><i className="economic-legend-swatch above" aria-hidden="true" />{t.betterThanBaseline}</span><span><i className="economic-legend-swatch below" aria-hidden="true" />{t.worseThanBaseline}</span></div>
      <section className="economic-cards" aria-label={text.mobile}>
        {visible.map((row) => <article className={`economic-card${row.historical ? ' economic-historical' : ''}`} key={`${row.code}-${row.historical}`}>
          <header><h2><span className={`economic-group ${row.group}`}>{t[row.group]}</span>{' '}<span>{t[row.season]}</span></h2><p className="economic-card-period">{period(row)}</p></header>
          <dl className="economic-card-facets">{economicFacets.slice(2).map(({ key }) => <div key={key}><dt>{t[key]}</dt><dd className={key === 'awd' ? `economic-awd ${row.awd}` : undefined}>{t[row[key]]}</dd></div>)}</dl>
          <dl className="economic-card-values">{environmentMetrics.map((metric) => {
            const comparison = row.historical ? null : metricComparison(row, metric)
            return <div key={metric}><dt>{text[metric]}</dt><dd><strong>{value(row, metric)}</strong><span>{environmentUnit(metric, language)}</span>{comparison && <small className={`economic-comparison-change${comparison.tone ? ` ${comparison.tone}` : ''}`} title={t.changeFromBaseline} aria-label={`${t.changeFromBaseline}: ${comparison.change}`}>({comparison.change})</small>}</dd></div>
          })}</dl>
        </article>)}
      </section>
    </>}
  </>
}
