import { useDashboardFilters } from '../../app/useDashboardFilters'
import { mapContextRows } from '../../app/mapNavigation'
import type { Language } from '../../i18n'
import ScenarioFilters from './ScenarioFilters'
import { emptyEconomicFilters, filterEconomicRows } from './economicsData'
import { economicsText } from './economicsText'
import { seasonalText } from './seasonalText'
import { averageSeasonalYears } from './seasonalYearAverage'
import type { SeasonalYear } from './seasonalYearAverage'
import { cropPeriods, cultivatedPeriods } from './seasonalData'
import type { CropPeriod, SeasonalData, SeasonalMetric, SeasonalRow } from './seasonalData'
import { seasonalLabel, seasonalNumber, seasonalUnit } from './seasonalFormatting'
import '../../styles/economics.css'

export default function SeasonalOverview({ data, metrics, language, mode, year, period, singlePeriod = false }: { data: SeasonalData; metrics: SeasonalMetric[]; language: Language; mode: 'year' | 'trend'; year: SeasonalYear; period: CropPeriod; singlePeriod?: boolean }) {
  const { filters, setFilters, scope } = useDashboardFilters()
  const t = seasonalText[language], labels = economicsText[language], currency = language === 'vi' ? 'VND' : 'USD'
  const allYears = mode === 'year' && year === 'all'
  const sourceRows = allYears ? averageSeasonalYears(data.rows) : data.rows
  const candidates = filterEconomicRows(mapContextRows(sourceRows, scope), filters).filter((row) => mode === 'trend' || year === 'all' || row.year === year)
  const yearLabel = (value: number) => allYears ? `${t.allYears} (${data.startYear}–${data.endYear})` : value
  const bases = [...new Map(candidates.map((row) => [`${row.family}:${row.condition}:${allYears ? 'all' : row.year}`, row])).values()]
  const entries = bases.flatMap((base) => (mode === 'year' && !singlePeriod ? cropPeriods : [period]).flatMap((crop) => {
    const row = sourceRows.find((item) => item.family === base.family && item.condition === base.condition && (allYears || item.year === base.year) && item.period === crop)
    if (row && !filterEconomicRows([row], filters).length) return []
    return [{ base, row, period: crop, notGrown: !cultivatedPeriods(base.family).includes(crop) }]
  }))
  const formatted = (row: SeasonalRow | undefined, metric: SeasonalMetric) => {
    const value = row?.[currency][metric]?.mean
    return value == null ? '—' : seasonalNumber(value, metric, language)
  }
  return <div className="seasonal-overview">
    <ScenarioFilters rows={sourceRows} filters={filters} onChange={setFilters} language={language} idPrefix="seasonal-filter" seasonLabel={t.system} />
    <div className="economic-results-toolbar"><p role="status"><strong>{entries.length}</strong> {language === 'vi' ? 'mục' : 'entries'}</p>{Object.values(filters).some((value) => value !== 'all') && <button type="button" title={labels.reset} className="economic-reset" onClick={() => setFilters(emptyEconomicFilters)}>{labels.reset}</button>}</div>
    {!entries.length ? <p>{labels.noResults}</p> : <>
      <div className="economic-table-region" role="region" aria-label={t.table} tabIndex={0}><table className="economic-table seasonal-table"><caption className="sr-only">{t.table}</caption>
        <thead><tr><th scope="col">{t.system}</th><th scope="col" className="economic-numeric">{t.year}</th><th scope="col">{t.period}</th><th scope="col">{labels.climate}</th><th scope="col">{labels.resource}</th><th scope="col">{labels.awd}</th>{metrics.map((metric) => <th scope="col" key={metric} className="economic-numeric"><span>{seasonalLabel(metric, language)}</span><small>{seasonalUnit(metric, language)}</small></th>)}</tr></thead>
        <tbody>{entries.map((entry) => <tr key={`${entry.base.family}-${entry.base.condition}-${yearLabel(entry.base.year)}-${entry.period}`}><th scope="row">{t[entry.base.family]}</th><td className="economic-numeric">{yearLabel(entry.base.year)}</td><td>{t[entry.period]}</td><td>{labels[entry.base.climate]}</td><td>{labels[entry.base.resource]}</td><td>{labels[(entry.row ?? entry.base).awd]}</td>{entry.notGrown ? <td colSpan={metrics.length} className="seasonal-missing">{t.notGrown}</td> : metrics.map((metric) => <td className="economic-numeric" key={metric}>{formatted(entry.row, metric)}</td>)}</tr>)}</tbody>
      </table></div>
      <section className="economic-cards" aria-label={t.table}>{entries.map((entry) => <article className="economic-card" key={`${entry.base.family}-${entry.base.condition}-${yearLabel(entry.base.year)}-${entry.period}`}>
        <header><h3>{t[entry.base.family]}</h3><p>{yearLabel(entry.base.year)} · {t[entry.period]}</p></header><dl className="economic-card-facets"><div><dt>{labels.climate}</dt><dd>{labels[entry.base.climate]}</dd></div><div><dt>{labels.resource}</dt><dd>{labels[entry.base.resource]}</dd></div><div><dt>{labels.awd}</dt><dd>{labels[(entry.row ?? entry.base).awd]}</dd></div></dl>
        {entry.notGrown ? <p className="seasonal-not-grown">{t.notGrown}</p> : <dl className="economic-card-values">{metrics.map((metric) => <div key={metric}><dt>{seasonalLabel(metric, language)}</dt><dd><strong>{formatted(entry.row, metric)}</strong><span>{seasonalUnit(metric, language)}</span></dd></div>)}</dl>}
      </article>)}</section>
    </>}
  </div>
}
