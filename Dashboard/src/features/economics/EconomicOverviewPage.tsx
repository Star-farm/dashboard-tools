import { useEffect, useState } from 'react'
import { getScrollBehavior } from '../../app/scrollBehavior'
import data from '../../data/economics-overview.json'
import type { Language } from '../../i18n'
import { economicMetrics, emptyEconomicFilters, filterEconomicRows } from './economicsData'
import type { EconomicFilters, EconomicRow } from './economicsData'
import { economicFacets, economicMetricUnits, economicsText } from './economicsText'
import '../../styles/economics.css'

const rows = data as EconomicRow[]

export default function EconomicOverviewPage({ language }: { language: Language }) {
  const t = economicsText[language]
  const [filters, setFilters] = useState<EconomicFilters>(emptyEconomicFilters)
  const visible = filterEconomicRows(rows, filters).sort((a, b) => Number(b.historical) - Number(a.historical))
  const filtered = Object.values(filters).some((value) => value !== 'all')
  const currency = language === 'vi' ? 'VND' : 'USD'
  const decimal = new Intl.NumberFormat(language, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const money = new Intl.NumberFormat(language, { minimumFractionDigits: language === 'vi' ? 0 : 2, maximumFractionDigits: language === 'vi' ? 0 : 2 })
  const unit = (metric: typeof economicMetrics[number]) => economicMetricUnits[metric] === '%' ? '%' : t[economicMetricUnits[metric] as 'moneyUnit' | 'yieldUnit' | 'laborUnit']
  const value = (row: EconomicRow, metric: typeof economicMetrics[number]) => {
    const amount = row[currency][metric]
    return amount === null ? '—' : (economicMetricUnits[metric] === 'moneyUnit' ? money : decimal).format(amount)
  }
  const period = (row: EconomicRow) => `${row.historical ? `${t.historical} · ` : ''}${row.startYear}–${row.endYear}`

  useEffect(() => {
    document.getElementById('economics-overview')?.scrollIntoView?.({ block: 'start', behavior: getScrollBehavior() })
  }, [])

  return (
    <div className="economics-page page-shell" id="economics-overview">
      <section className="intro" aria-labelledby="economics-title"><h1 id="economics-title">{t.title}</h1></section>
      <form className="economic-filters" aria-label={t.filters} onSubmit={(event) => event.preventDefault()}>
        {economicFacets.map(({ key, options }) => (
          <div className="economic-filter" key={key}>
            <label htmlFor={`economic-${key}`}>{t[key]}</label>
            <div className="economic-select-control">
              <span className="economic-selected-label" aria-hidden="true">{filters[key] === 'all' ? t.all : t[filters[key] as keyof typeof t]}</span>
              <select id={`economic-${key}`} value={filters[key]} onChange={(event) => setFilters({ ...filters, [key]: event.target.value })}>
                <option value="all">{t.all}</option>
                {options.filter((option) => rows.some((row) => row[key] === option)).map((option) => <option key={option} value={option}>{t[option]}</option>)}
              </select>
            </div>
          </div>
        ))}
      </form>
      <div className="economic-results-toolbar">
        <p role="status"><strong>{visible.length}</strong> {t.scenario}</p>
        {filtered && visible.length > 0 && <button type="button" className="economic-reset" onClick={() => setFilters(emptyEconomicFilters)}>{t.reset}<span aria-hidden="true"> ↺</span></button>}
      </div>
      {visible.length === 0 ? <div className="economic-empty"><h2>{t.noResults}</h2><p>{t.noResultsDescription}</p><button type="button" className="primary-button" onClick={() => setFilters(emptyEconomicFilters)}>{t.reset}</button></div> : <>
        <div className="economic-table-region" role="region" aria-label={t.tableCaption} tabIndex={0}>
          <table className="economic-table">
            <caption className="sr-only">{t.tableCaption}</caption>
            <colgroup>{economicFacets.map(({ key }) => <col key={key} className={`economic-${key}-column`} />)}{economicMetrics.map((metric) => <col key={metric} className={economicMetricUnits[metric] === 'moneyUnit' ? 'economic-money-column' : undefined} />)}</colgroup>
            <thead>
              <tr className="economic-column-groups"><th scope="colgroup" colSpan={5}>{t.scenarioColumns}</th><th scope="colgroup" colSpan={5}>{t.financialColumns}</th><th scope="colgroup" colSpan={2}>{t.productionColumns}</th></tr>
              <tr>{economicFacets.map(({ key }) => <th scope="col" key={key} className={key === 'awd' ? 'economic-divider' : undefined}>{t[key]}</th>)}{economicMetrics.map((metric) => <th scope="col" key={metric} className={`economic-numeric${metric === 'margin' ? ' economic-divider' : ''}`} title={metric === 'roi' ? t.roiNote : undefined}><span>{t[metric]}</span><small>{t.unit}: {unit(metric)}</small></th>)}</tr>
            </thead>
            <tbody>{visible.map((row, index) => <tr key={`${row.code}-${row.historical}`} className={[row.historical ? 'economic-historical' : '', index > 0 && (visible[index - 1].group !== row.group || visible[index - 1].season !== row.season) ? 'economic-section-start' : ''].filter(Boolean).join(' ') || undefined}>
              <th scope="row"><span className={`economic-group ${row.group}`}>{t[row.group]}</span>{' '}<small className="economic-row-period">{period(row)}</small></th>
              <td>{t[row.season]}</td><td>{t[row.climate]}</td><td>{t[row.resource]}</td><td className="economic-divider"><span className={`economic-awd ${row.awd}`}>{t[row.awd]}</span></td>
              {economicMetrics.map((metric) => <td className={`economic-numeric${metric === 'income' ? ' economic-income' : ''}${metric === 'margin' ? ' economic-divider' : ''}`} key={metric}>{value(row, metric)}{unit(metric) === '%' ? '%' : ''}</td>)}
            </tr>)}</tbody>
          </table>
        </div>
        <section className="economic-cards" aria-label={t.mobileResults}>
          {visible.map((row) => <article className={`economic-card${row.historical ? ' economic-historical' : ''}`} key={`${row.code}-${row.historical}`}>
            <header><h2><span className={`economic-group ${row.group}`}>{t[row.group]}</span>{' '}<span>{t[row.season]}</span></h2><p className="economic-card-period">{period(row)}</p></header>
            <dl className="economic-card-facets">{economicFacets.slice(2).map(({ key }) => <div key={key}><dt>{t[key]}</dt><dd className={key === 'awd' ? `economic-awd ${row.awd}` : undefined}>{t[row[key]]}</dd></div>)}</dl>
            <dl className="economic-card-values">{economicMetrics.map((metric) => <div className={metric === 'income' ? 'economic-card-income' : undefined} key={metric}><dt>{t[metric]}</dt><dd><strong>{value(row, metric)}</strong><span>{unit(metric)}</span></dd></div>)}</dl>
          </article>)}
        </section>
      </>}
    </div>
  )
}
