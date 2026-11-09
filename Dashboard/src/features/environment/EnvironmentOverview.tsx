import { useDashboardFilters } from '../../app/useDashboardFilters'
import { mapContextRows } from '../../app/mapNavigation'
import type { Language } from '../../i18n'
import { emptyEconomicFilters, filterEconomicRows } from '../economics/economicsData'
import { economicFacets, economicsText } from '../economics/economicsText'
import ScenarioFilters from '../economics/ScenarioFilters'
import { environmentMetrics } from './environmentTypes'
import type { EnvironmentData, EnvironmentRow } from './environmentTypes'
import { environmentNumber, environmentUnit } from './environmentAnalysis'
import { environmentText } from './environmentText'

export default function EnvironmentOverview({ data, language }: { data: Pick<EnvironmentData, 'rows'>; language: Language }) {
  const { filters, setFilters, scope } = useDashboardFilters()
  const t = economicsText[language], text = environmentText[language]
  const visible = filterEconomicRows(mapContextRows(data.rows, scope), filters)
  const filtered = Object.values(filters).some((value) => value !== 'all')
  const period = (row: EnvironmentRow) => `${row.historical ? `${t.historical} · ` : ''}${row.startYear}–${row.endYear}`
  return <>
    <ScenarioFilters rows={data.rows} filters={filters} onChange={setFilters} language={language} idPrefix="environment-filter" />
    <div className="economic-results-toolbar"><p role="status"><strong>{visible.length}</strong> {t.scenario}</p>{filtered && <button type="button" title={t.reset} className="economic-reset" onClick={() => setFilters(emptyEconomicFilters)}>{t.reset}<span aria-hidden="true"> ↺</span></button>}</div>
    {!visible.length ? <div className="economic-empty"><h2>{t.noResults}</h2><p>{t.noResultsDescription}</p></div> : <>
      <div className="economic-table-region" role="region" aria-label={text.table} tabIndex={0}><table className="economic-table environment-table">
        <caption className="sr-only">{text.table}</caption>
        <colgroup>{economicFacets.map(({ key }) => <col key={key} className={`environment-${key}-column`} />)}{environmentMetrics.map((metric) => <col className="environment-number-column" key={metric} />)}</colgroup>
        <thead><tr className="economic-column-groups"><th scope="colgroup" colSpan={5}>{t.scenarioColumns}</th><th scope="colgroup" colSpan={2}>{text.indicators}</th></tr><tr>{economicFacets.map(({ key }) => <th scope="col" className={key === 'awd' ? 'economic-divider' : undefined} key={key}>{t[key]}</th>)}{environmentMetrics.map((metric) => <th scope="col" className="economic-numeric" key={metric}><span>{text[metric]}</span><small>{text.unit}: {environmentUnit(metric, language)}</small></th>)}</tr></thead>
        <tbody>{visible.map((row, index) => <tr key={`${row.code}:${row.historical}`} className={[row.historical ? 'economic-historical' : '', index && (visible[index - 1].group !== row.group || visible[index - 1].season !== row.season) ? 'economic-section-start' : ''].filter(Boolean).join(' ') || undefined}>
          <th scope="row"><span className={`economic-group ${row.group}`}>{t[row.group]}</span><small className="economic-row-period">{period(row)}</small></th><td>{t[row.season]}</td><td>{t[row.climate]}</td><td>{t[row.resource]}</td><td className="economic-divider"><span className={`economic-awd ${row.awd}`}>{t[row.awd]}</span></td>
          {environmentMetrics.map((metric) => <td className="economic-numeric" key={metric}>{row.values[metric] === null ? '—' : environmentNumber(row.values[metric], language)}</td>)}
        </tr>)}</tbody>
      </table></div>
      <section className="economic-cards" aria-label={text.mobile}>{visible.map((row) => <article className={`economic-card${row.historical ? ' economic-historical' : ''}`} key={`${row.code}:${row.historical}`}>
        <header><h2><span className={`economic-group ${row.group}`}>{t[row.group]}</span><span>{t[row.season]}</span></h2><p className="economic-card-period">{period(row)}</p></header>
        <dl className="economic-card-facets">{economicFacets.slice(2).map(({ key }) => <div key={key}><dt>{t[key]}</dt><dd className={key === 'awd' ? `economic-awd ${row.awd}` : undefined}>{t[row[key]]}</dd></div>)}</dl>
        <dl className="economic-card-values">{environmentMetrics.map((metric) => <div key={metric}><dt>{text[metric]}</dt><dd><strong>{row.values[metric] === null ? '—' : environmentNumber(row.values[metric], language)}</strong><span>{environmentUnit(metric, language)}</span></dd></div>)}</dl>
      </article>)}</section>
    </>}
  </>
}
