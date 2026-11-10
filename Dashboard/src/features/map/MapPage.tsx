import { mapDestination, readMapContext } from '../../app/mapNavigation'
import type { MapNavigationContext } from '../../app/mapNavigation'
import { cropPeriods } from '../economics/seasonalData'
import { seasonalText } from '../economics/seasonalText'
import { useEffect, useMemo, useState } from 'react'
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { Language } from '../../i18n'
import { CHART_TICK, CHART_TOOLTIP } from '../../components/chartStyles'
import { economicFacets, economicsText } from '../economics/economicsText'
import { emptyEconomicFilters, filterEconomicRows } from '../economics/economicsData'
import type { EconomicFilters, EconomicRow } from '../economics/economicsData'
import economics from '../../data/economics-overview.json'
import resources from '../../data/resources-overview.json'
import environment from '../../data/environment-overview.json'
import { colorBreaks, csvForPlots, displayMapCurrency, mapColors, mean, plotTrend, selectPlotValues } from './mapData'
import { mapText } from './mapText'
import type { MapCurrency, MapCurrencyCode, MapGeometry, MapManifest, MapMetric, MapResults, MapScenario, PlotMetric } from './mapTypes'
import PlotMap from './PlotMap'
import { useMapFile, useMapFiles } from './useMapFile'
import '../../styles/map.css'

function DashboardContext({ scenarios, language, context }: { scenarios: MapScenario[]; language: Language; context: MapNavigationContext }) {
  const t = mapText[language]
  const codes = new Set(scenarios.map((scenario) => scenario.code))
  const economic = economics.filter((row) => codes.has(row.code) && !row.historical)
  const resource = resources.rows.filter((row) => codes.has(row.code) && !row.historical)
  const environmental = environment.rows.filter((row) => codes.has(row.code) && !row.historical)
  const currency = language === 'vi' ? 'VND' : 'USD'
  const weighted = (items: { value: number | null; count: number }[]) => {
    const valid = items.filter((item) => item.value !== null && item.count > 0)
    const count = valid.reduce((sum, item) => sum + item.count, 0)
    return count ? valid.reduce((sum, item) => sum + item.value! * item.count, 0) / count : null
  }
  const number = new Intl.NumberFormat(language, { maximumFractionDigits: 1 })
  const money = new Intl.NumberFormat(language, { maximumFractionDigits: language === 'vi' ? 0 : 2 })
  const cards = [
    { label: t.cost, value: weighted(economic.map((row) => ({ value: row[currency].cost, count: row.count }))), unit: language === 'vi' ? 'VNĐ/ha' : 'USD/ha', href: '#economics-overview', link: t.economics, money: true },
    { label: t.water, value: weighted(resource.map((row) => ({ value: row.values.water, count: row.metricCounts.water }))), unit: 'mm', href: '#resources-overview', link: t.resources },
    { label: t.methane, value: weighted(environmental.map((row) => ({ value: row.values.methane, count: row.metricCounts.methane }))), unit: language === 'vi' ? 'kg metan/ha' : 'kg methane/ha', href: '#environment-overview', link: t.environment },
  ]
  return <section className="map-dashboard-context" aria-labelledby="map-context-title">
    <div className="map-section-heading"><h2 id="map-context-title">{t.reference}</h2><span>{t.referencePeriod}</span></div>
    <p className="map-context-note">{t.referenceNote}</p>
    <div className="map-context-values">{cards.map((card) => <article key={card.label}>
      <h3>{card.label}</h3><p>{card.value == null ? '—' : (card.money ? money : number).format(card.value)} <span>{card.unit}</span></p>
      <a href={mapDestination(card.href, context)}>{card.link}<span aria-hidden="true"> →</span></a>
    </article>)}</div>
  </section>
}

export default function MapPage({ language }: { language: Language }) {
  const t = mapText[language]
  const manifest = useMapFile<MapManifest>('manifest.json')
  const geometry = useMapFile<MapGeometry>('geometry.json')
  const conversion = useMapFile<MapCurrency>('currency.json')
  const currencyCode: MapCurrencyCode = language === 'vi' ? 'VND' : 'USD'
  const filterText = economicsText[language]
  const [initialContext] = useState(readMapContext)
  const [filters, setFilters] = useState<EconomicFilters>(() => initialContext?.filters ?? emptyEconomicFilters)
  const [year, setYear] = useState(() => initialContext?.year ?? 2027)
  const [season, setSeason] = useState(() => initialContext?.harvest ?? 0)
  const [metric, setMetric] = useState<MapMetric>('yield')
  const [trendMetric, setTrendMetric] = useState<PlotMetric>('yield')
  const [playing, setPlaying] = useState(false)
  const mapRows = useMemo(() => (economics as EconomicRow[]).filter((row) => !row.historical && manifest.data?.scenarios.some((scenario) => scenario.code === row.code)), [manifest.data])
  const visibleRows = filterEconomicRows(mapRows, filters)
  const codes = new Set(visibleRows.map((row) => row.code))
  const matchingScenarios = manifest.data?.scenarios.filter((scenario) => codes.has(scenario.code)) ?? []
  const availableSeasons = matchingScenarios.length ? Math.max(...matchingScenarios.map((scenario) => scenario.seasons)) : 2
  const scenarios = matchingScenarios.filter((scenario) => season === 0 || scenario.seasons >= season)
  const scenarioFiles = scenarios.map((scenario) => scenario.file)
  const aggregate = manifest.data?.aggregates?.[[...scenarioFiles].sort().join('|')]
  const files = useMapFiles<MapResults>(aggregate ? [aggregate] : scenarioFiles)
  const results = { ...files, data: useMemo(() => files.data ? files.data.length === 1 ? files.data[0] : { id: files.data.map((item) => item.id).join('+'), records: files.data.flatMap((item) => item.records), runs: files.data.reduce((sum, item) => sum + item.runs, 0), seeds: {}, sourceRows: files.data.reduce((sum, item) => sum + item.sourceRows, 0) } : undefined, [files.data]) }
  const displayData = useMemo(() => results.data && conversion.data ? displayMapCurrency(results.data, currencyCode, conversion.data.vndPerUsd) : undefined, [results.data, conversion.data, currencyCode])
  const yieldValues = useMemo(() => displayData ? selectPlotValues(displayData.records, year, season, 'yield') : [], [displayData, year, season])
  const incomeValues = useMemo(() => displayData ? selectPlotValues(displayData.records, year, season, 'income') : [], [displayData, year, season])
  const breaks = useMemo(() => displayData ? colorBreaks(displayData, metric) : [], [displayData, metric])
  const trend = useMemo(() => displayData ? plotTrend(displayData, season, trendMetric, null) : [], [displayData, season, trendMetric])
  const number = new Intl.NumberFormat(language, { maximumFractionDigits: 2 })
  const money = new Intl.NumberFormat(language, { maximumFractionDigits: language === 'vi' ? 0 : 2 })
  const trendNumber = trendMetric === 'income' ? money : number
  const legendNumber = metric === 'income' && currencyCode === 'VND' ? new Intl.NumberFormat(language, { notation: 'compact', maximumFractionDigits: 1 }) : metric === 'income' ? money : number
  const values = metric === 'income' ? incomeValues : yieldValues
  const unit = metric === 'income' ? t.incomeUnit : t.yieldUnit
  const trendUnit = trendMetric === 'income' ? t.incomeUnit : t.yieldUnit
  const selectedYield = mean(yieldValues)
  const selectedIncome = mean(incomeValues)
  const format = (value: number | null | undefined) => value == null ? '—' : number.format(value)
  const formatMoney = (value: number | null | undefined) => value == null ? '—' : money.format(value)
  const period = `${year} · ${season === 0 ? t.allHarvests : seasonalText[language][cropPeriods[season - 1]]}`
  const hasError = manifest.error || geometry.error || results.error || conversion.error
  const loading = !manifest.data || !geometry.data || !displayData
  const colors = mapColors
  const facets = economicFacets.slice(0, 4)
  const isPlaying = playing && year < 2050
  useEffect(() => {
    if (!isPlaying || loading || hasError) return
    const timer = window.setInterval(() => setYear((current) => current < 2050 ? current + 1 : 2050), 1000)
    return () => window.clearInterval(timer)
  }, [isPlaying, loading, hasError, metric])
  function changeMetric(next: MapMetric) { setMetric(next); setTrendMetric(next) }
  function changeFilter(index: number, value: string) {
    const next = { ...filters, [facets[index].key]: value }
    for (const facet of facets.slice(index + 1)) next[facet.key] = 'all'
    const nextCodes = new Set(filterEconomicRows(mapRows, next).map((row) => row.code))
    if (!manifest.data?.scenarios.some((scenario) => nextCodes.has(scenario.code) && scenario.seasons >= season)) setSeason(0)
    setFilters(next); setPlaying(false)
  }
  function download() {
    if (!geometry.data || !displayData) return
    const scenarioId = scenarios.length === 1 ? scenarios[0].id : `combined-${scenarios.length}-scenarios`
    const text = csvForPlots(geometry.data.plots.map((shape) => ({ id: shape.id, areaHa: shape.areaHa, yield: yieldValues[shape.id] ?? null, income: incomeValues[shape.id] ?? null })), scenarios.map((scenario) => scenario.code).join('|'), year, season, currencyCode)
    const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8;' }))
    const link = document.createElement('a')
    link.href = url; link.download = `star-farm-${scenarioId}-${year}-harvest-${season}-${currencyCode}.csv`; link.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  return <div className="map-page page-shell" id="map">
    <section className="intro" aria-labelledby="map-title"><h1 id="map-title">{t.title}</h1><p className="map-description">{t.description}</p></section>
    <div className="map-filter-section">
    <h2 className="map-filter-title">
    {language === 'vi' ? 'Lọc kịch bản' : 'Scenario Filters'}
    </h2>
    <form className="map-filters" aria-label={filterText.filters} onSubmit={(event) => event.preventDefault()}>
      {facets.map((facet, index) => {
        const preceding = facets.slice(0, index)
        const available = new Set(mapRows.filter((row) => preceding.every(({ key }) => filters[key] === 'all' || row[key] === filters[key])).map((row) => row[facet.key]))
        return <div key={facet.key}><label htmlFor={`map-${facet.key}`}>{filterText[facet.key]}</label><select id={`map-${facet.key}`} value={filters[facet.key]} onChange={(event) => changeFilter(index, event.target.value)}>
          <option value="all">{filterText.all}</option>{facet.options.filter((option) => available.has(option)).map((option) => <option key={option} value={option}>{filterText[option]}</option>)}
        </select></div>
      })}
    </form>
    </div>
    <section className="map-workspace" aria-labelledby="map-layer-title">
      <div className="map-workspace-heading"><div><h2 id="map-layer-title">{t[metric]}</h2></div>
        <div className="map-layer-switch" role="group" aria-label={t.layer}>{(['yield', 'income'] as const).map((value) => <button type="button" key={value} aria-pressed={metric === value} onClick={() => changeMetric(value)}>{t[value]}</button>)}</div>
      </div>
      <div className="map-time-controls">
      <button
        type="button"
        className="map-play"
        aria-label={isPlaying ? t.pause : t.play}
        title={isPlaying ? t.pause : t.play}
        aria-pressed={isPlaying}
        disabled={loading || !!hasError}
        onClick={() => {
          if (isPlaying) {
            setPlaying(false)
          } else {
            if (year >= 2050) setYear(2027)
            setPlaying(true)
          }
        }}
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 16 16"
          width="18"
          height="18"
          fill="currentColor"
        >
          {isPlaying ? (
            <path d="M3 2h4v12H3zM9 2h4v12H9z" />
          ) : (
            <path d="M3 1l12 7-12 7z" />
          )}
        </svg>
      </button>
        <div className="map-year-control"><label htmlFor="map-year">{t.year} <strong>{year}</strong></label><input id="map-year" list="map-year-stops" type="range" min={2027} max={2050} step={1} value={year} onChange={(event) => { setYear(Number(event.target.value)); setPlaying(false) }} /><datalist id="map-year-stops">{Array.from({ length: 24 }, (_, index) => <option key={index} value={2027 + index} />)}</datalist><div className="map-year-labels" aria-hidden="true">{Array.from({ length: 5 }, (_, index) => <span key={index}>{2027 + Math.round(index * 23 / 4)}</span>)}</div></div>
        <div className="map-season-control"><label htmlFor="map-harvest">{t.harvest}</label><select id="map-harvest" value={season} onChange={(event) => { setSeason(Number(event.target.value)); setPlaying(false) }}><option value={0}>{t.allHarvests}</option>{Array.from({ length: availableSeasons }, (_, index) => <option key={index} value={index + 1}>{seasonalText[language][cropPeriods[index]]}</option>)}</select></div>
      </div>
      {hasError && <div className="map-error" role="alert"><p>{t.error}</p><button type="button" className="primary-button" onClick={() => { manifest.retry(); geometry.retry(); results.retry(); conversion.retry() }}>{t.retry}</button></div>}
      <div className="map-summary" aria-label={t.selectedPeriod}>
        <div><span>{t.averageYield}</span><strong>{format(selectedYield)} <small>{t.yieldUnit}</small></strong></div>
        <div><span>{t.averageIncome}</span><strong>{formatMoney(selectedIncome)} <small>{t.incomeUnit}</small></strong></div>
        <div className="map-summary-period"><span>{t.selectedPeriod}</span><strong>{period}</strong></div>
        <button type="button" className="map-download" onClick={download} disabled={loading || !!hasError}>{t.download}</button>
      </div>
      <div className="map-explorer-grid" aria-busy={loading && !hasError}>
        <div className="map-visual-column">
          <div className="map-canvas-container">
            {geometry.data ? <PlotMap geometry={geometry.data} values={values} metric={metric} breaks={breaks} language={language} yieldValues={yieldValues} incomeValues={incomeValues} periodLabel={period} scenarioLabel={scenarios.length === 1 ? scenarios[0].code : `${scenarios.length} ${filterText.scenario}`} /> : <div className="map-canvas-skeleton" />}
            {loading && !hasError && <div className="map-loading-overlay" role="status">{t.loading}</div>}
          </div>
          <div className="map-legend" aria-label={`${t[metric]} (${unit})`}><div className="map-legend-title"><strong>{t[metric]}</strong><span>{unit}</span></div>
            <div className="map-legend-steps">{colors.map((color, index) => <div key={color}><span style={{ background: color }} /><small title={breaks.length ? `${(metric === 'income' ? money : number).format(breaks[index])} – ${(metric === 'income' ? money : number).format(breaks[index + 1])}` : undefined}>{breaks.length ? `${legendNumber.format(breaks[index])} – ${legendNumber.format(breaks[index + 1])}` : '—'}</small></div>)}</div>
            <p>{t.legendNote}</p>
          </div>
          <p className="map-interaction-help" id="map-interaction-help">{t.instructions}</p>
        </div>

      </div>
    </section>
    <section className="map-trend-section" aria-labelledby="map-trend-title">
      <div className="map-section-heading"><div><h2 id="map-trend-title">{t.trend}</h2></div><div className="map-layer-switch" role="group" aria-label={t.trend}>{(['yield', 'income'] as const).map((value) => <button type="button" key={value} aria-pressed={trendMetric === value} onClick={() => setTrendMetric(value)}>{t[value]}</button>)}</div></div>
      <p className="map-chart-note">{t.trendNote} · {trendUnit}</p>
{loading ? <div className="map-trend-skeleton" /> : <div className="map-trend-chart" role="img" aria-label={`${t.trend} · ${t[trendMetric]} · ${period}`}>
        <ResponsiveContainer width="100%" height={290}>
        <LineChart
          data={trend}
          margin={{ top: 16, right: 24, left: 20, bottom: 20 }}
        >
          <CartesianGrid stroke="#dce3d9" vertical={false} />

          <XAxis
            dataKey="year"
            type="number"
            domain={[2027, 2050]}
            ticks={[2027, 2030, 2035, 2040, 2045, 2050]}
            tick={CHART_TICK}
            tickLine={false}
            axisLine={false}
            tickMargin={12}
            padding={{ left: 12, right: 12 }}
          />

          <YAxis
            width={85}
            domain={['auto', 'auto']}
            tickFormatter={(value: number) =>
              trendMetric === 'income'
                ? new Intl.NumberFormat(language, {
                    notation: 'compact',
                    maximumFractionDigits: 1,
                  }).format(value)
                : number.format(value)
            }
            tick={CHART_TICK}
            tickLine={false}
            axisLine={false}
            tickMargin={12}
          />

          <Tooltip
            labelFormatter={(value) => `${t.year} ${value}`}
            formatter={(value) => [
              value == null
                ? '—'
                : `${trendNumber.format(Number(value))} ${trendUnit}`,
              t[trendMetric],
            ]}
            contentStyle={CHART_TOOLTIP}
          />

          <ReferenceLine
            x={year}
            stroke="#ad8950"
            strokeDasharray="4 4"
          />

          <Line
            dataKey="value"
            type="linear"
            stroke="#254f3d"
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 5 }}
            connectNulls={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
      </div>}
      <details className="map-trend-table"><summary>{t.showTable} · 2027–2050</summary><div className="map-data-table-scroll"><table><thead><tr><th>{t.year}</th><th>{t[trendMetric]} ({trendUnit})</th></tr></thead><tbody>{trend.map((point) => <tr key={point.year}><td>{point.year}</td><td>{point.value == null ? '—' : trendNumber.format(point.value)}</td></tr>)}</tbody></table></div></details>
    </section>
    {scenarios.length > 0 && <DashboardContext scenarios={scenarios} language={language} context={{ filters, year, harvest: season, codes: scenarios.map((scenario) => scenario.code) }} />}

  </div>
}
