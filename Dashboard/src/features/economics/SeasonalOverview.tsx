import { useState } from 'react'
import { useDashboardFilters } from '../../app/useDashboardFilters'
import { mapContextRows } from '../../app/mapNavigation'
import type { Language } from '../../i18n'
import ScenarioAbbreviations from '../../components/ScenarioAbbreviations'
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

const economicTableMetricLabels: Partial<Record<SeasonalMetric, keyof typeof economicsText.en>> = {
  income: 'income', cost: 'cost', straw: 'straw', roi: 'roi', margin: 'margin', yield: 'yield', labor: 'labor',
}

export default function SeasonalOverview({ data, metrics, language, mode, year, period, singlePeriod = false }: { data: SeasonalData; metrics: SeasonalMetric[]; language: Language; mode: 'year' | 'trend'; year: SeasonalYear; period: CropPeriod; singlePeriod?: boolean }) {
  const { filters, setFilters, scope } = useDashboardFilters()
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(() => new Set())
  const t = seasonalText[language], labels = economicsText[language], currency = language === 'vi' ? 'VND' : 'USD'
  const allYears = mode === 'year' && year === 'all'
  const sourceRows = allYears ? averageSeasonalYears(data.rows) : data.rows
  const candidates = filterEconomicRows(mapContextRows(sourceRows, scope), filters).filter((row) => mode === 'trend' || year === 'all' || row.year === year)
  const yearLabel = (value: number) => allYears ? `${t.allYears} (${data.startYear}–${data.endYear})` : value
  const bases = [...new Map(candidates.filter((row) => !allYears || row.family !== 'bau').map((row) => [`${row.family}:${row.condition}:${allYears ? 'all' : row.year}`, row])).values()]
  const entries = bases.flatMap((base) => (mode === 'year' && !singlePeriod ? cropPeriods : [period]).flatMap((crop) => {
    const row = sourceRows.find((item) => item.family === base.family && item.condition === base.condition && (allYears || item.year === base.year) && item.period === crop)
    if (row && !filterEconomicRows([row], filters).length) return []
    return [{ base, row, period: crop, notGrown: !cultivatedPeriods(base.family).includes(crop) }]
  }))
  const metricGroups = [
    { title: t.financialPerformance, metrics: metrics.filter((metric) => ['income', 'cost', 'straw', 'roi', 'margin'].includes(metric)) },
    { title: t.production, metrics: metrics.filter((metric) => ['yield', 'labor'].includes(metric)) },
    { title: t.resourceIndicators, metrics: metrics.filter((metric) => ['water', 'fertilizer', 'pesticides'].includes(metric)) },
    { title: t.environmentalIndicators, metrics: metrics.filter((metric) => ['methane', 'intensity', 'awd'].includes(metric)) },
  ].filter((group) => group.metrics.length)
  const tableMetrics = metricGroups.flatMap((group) => group.metrics)
  const tableMetricLabel = (metric: SeasonalMetric) => {
    const label = economicTableMetricLabels[metric]
    return label ? labels[label] : seasonalLabel(metric, language)
  }
  const groupedEntries = entries.reduce<{ key: string; entries: typeof entries }[]>((groups, entry) => {
    const key = `${entry.base.family}:${entry.base.condition}:${allYears ? 'all' : entry.base.year}`
    const current = groups.at(-1)
    if (current?.key === key) current.entries.push(entry)
    else groups.push({ key, entries: [entry] })
    return groups
  }, [])
  const toggleGroup = (key: string) => setCollapsedGroups((current) => {
    const next = new Set(current)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    return next
  })
  const formatted = (row: SeasonalRow | undefined, metric: SeasonalMetric) => {
    const value = row?.[currency][metric]?.mean
    return value == null ? '-' : seasonalNumber(value, metric, language)
  }
  return <div className="seasonal-overview">
    <ScenarioFilters rows={sourceRows} filters={filters} onChange={setFilters} language={language} idPrefix="seasonal-filter" seasonLabel={t.system} />
    <div className="economic-results-toolbar"><p role="status"><strong>{entries.length}</strong> {language === 'vi' ? 'mục' : 'entries'}</p>{Object.values(filters).some((value) => value !== 'all') && <button type="button" title={labels.reset} className="economic-reset" onClick={() => setFilters(emptyEconomicFilters)}>{labels.reset}</button>}</div>
    {!entries.length ? <p>{labels.noResults}</p> : <>
      <div className="seasonal-pivot"><div className="economic-table-region seasonal-table-region" role="region" aria-label={t.table} tabIndex={0}><table className="economic-table seasonal-table"><caption className="sr-only">{t.table}</caption>
        <colgroup><col className="seasonal-period-column" />{tableMetrics.map((metric) => <col className={`seasonal-metric-column seasonal-${metric}-column`} key={metric} />)}</colgroup>
        <thead><tr className="economic-column-groups"><th scope="colgroup">{labels.scenarioTableGroup}</th>{metricGroups.map((group) => <th key={group.title} scope="colgroup" colSpan={group.metrics.length}>{group.title}</th>)}</tr><tr><th scope="col">{t.period}</th>{tableMetrics.map((metric) => <th scope="col" key={metric} className="economic-numeric"><span>{tableMetricLabel(metric)}</span><small>{labels.unit}: {seasonalUnit(metric, language)}</small></th>)}</tr></thead>
        {groupedEntries.map(({ key, entries: groupEntries }) => {
          const first = groupEntries[0]
          const collapsed = collapsedGroups.has(key)
          return <tbody key={key} className="economic-scenario-group"><tr className="economic-group-heading"><th colSpan={tableMetrics.length + 1}><button type="button" aria-expanded={!collapsed} onClick={() => toggleGroup(key)}><span className="economic-pivot-group-title"><span className={`economic-group ${first.base.group}`}><ScenarioAbbreviations text={t[first.base.family]} language={language} /></span><span className="economic-group-separator">—</span><span>{yearLabel(first.base.year)}</span><span>· {labels[first.base.climate]}</span><span>· {labels[first.base.resource]}</span></span><small className="economic-pivot-group-awd">{labels[(first.row ?? first.base).awd]}</small></button></th></tr>
            {!collapsed && groupEntries.map((entry) => <tr key={`${entry.base.family}-${entry.base.condition}-${yearLabel(entry.base.year)}-${entry.period}`}><th scope="row">{t[entry.period]}</th>{entry.notGrown ? <td colSpan={tableMetrics.length} className="seasonal-missing"><span className="seasonal-missing-label">{t.notGrown}</span></td> : tableMetrics.map((metric) => <td className="economic-numeric" key={metric}>{formatted(entry.row, metric)}</td>)}</tr>)}
          </tbody>
        })}
      </table></div></div>
      <section className="economic-cards" aria-label={t.table}>{entries.map((entry) => <article className="economic-card" key={`${entry.base.family}-${entry.base.condition}-${yearLabel(entry.base.year)}-${entry.period}`}>
        <header><h3>{t[entry.base.family]}</h3><p>{yearLabel(entry.base.year)} · {t[entry.period]}</p></header><dl className="economic-card-facets"><div><dt>{labels.climate}</dt><dd>{labels[entry.base.climate]}</dd></div><div><dt>{labels.resource}</dt><dd>{labels[entry.base.resource]}</dd></div><div><dt>{labels.awd}</dt><dd>{labels[(entry.row ?? entry.base).awd]}</dd></div></dl>
        {entry.notGrown ? <p className="seasonal-not-grown">{t.notGrown}</p> : <dl className="economic-card-values">{metrics.map((metric) => <div key={metric}><dt>{seasonalLabel(metric, language)}</dt><dd><strong>{formatted(entry.row, metric)}</strong><span>{seasonalUnit(metric, language)}</span></dd></div>)}</dl>}
      </article>)}</section>
    </>}
  </div>
}
