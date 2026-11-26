import { readMapContext } from '../../app/mapNavigation'
import { cropPeriods } from '../economics/seasonalData'
import { seasonalText } from '../economics/seasonalText'
import { useEffect, useMemo, useState } from 'react'
import type { Language } from '../../i18n'
import { economicFacets, economicsText } from '../economics/economicsText'
import { emptyEconomicFilters, filterEconomicRows } from '../economics/economicsData'
import type { EconomicFilters, EconomicRow } from '../economics/economicsData'
import economics from '../../data/economics-overview.json'
import {
  displayMapCurrency,
  mapColors,
  incomeMapColors,
  selectPlotValues,
} from './mapData'
import { mapText } from './mapText'
import type { AdminBoundaryData, MapCurrency, MapCurrencyCode, MapGeometry, MapManifest, MapMetric, MapResults } from './mapTypes'
import PlotMap from './PlotMap'
import { useMapFile, useMapFiles } from './useMapFile'
import '../../styles/chart-info.css'
import '../../styles/map.css'

export default function MapPage({ language }: { language: Language }) {
  const t = mapText[language]
  const manifest = useMapFile<MapManifest>('manifest.json')
  const geometry = useMapFile<MapGeometry>('geometry.json')
  const adminBoundaries = useMapFile<AdminBoundaryData>('admin-boundaries.geojson')
  const conversion = useMapFile<MapCurrency>('currency.json')
  const currencyCode: MapCurrencyCode = language === 'vi' ? 'VND' : 'USD'
  const filterText = economicsText[language]
  const [initialContext] = useState(readMapContext)
  const [filters, setFilters] = useState<EconomicFilters>(() => initialContext?.filters ?? emptyEconomicFilters)
  const [year, setYear] = useState(() => initialContext?.year ?? 2027)
  const [season, setSeason] = useState(() => initialContext?.harvest ?? 0)
  const [metric, setMetric] = useState<MapMetric>('yield')
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
  const breaks = useMemo(() => {
    if (!displayData) return []


    if (metric === 'yield') {
      return [4, 5, 6, 7, 8, 9]
    }


    const incomeBreaksVND = [
      -10_000_000,
      0,
      10_000_000,
      20_000_000,
      30_000_000,
      50_000_000,
    ]

    if (currencyCode === 'VND') {
      return incomeBreaksVND
    }


    const rate = conversion.data?.vndPerUsd

    if (!rate || rate <= 0) return []

    return incomeBreaksVND.map(value => value / rate)
  }, [displayData, metric, currencyCode, conversion.data])

  const number = new Intl.NumberFormat(language, { maximumFractionDigits: 2 })
  const money = new Intl.NumberFormat(language, { maximumFractionDigits: language === 'vi' ? 0 : 2 })
  const legendNumber = metric === 'income' && currencyCode === 'VND' ? new Intl.NumberFormat(language, { notation: 'compact', maximumFractionDigits: 1 }) : metric === 'income' ? money : number
  const formatLegendValue = (value: number) => legendNumber.format(metric === 'income' && language === 'en' ? Math.round(value / 100) * 100 : value)
  const values = metric === 'income' ? incomeValues : yieldValues
  const unit = metric === 'income' ? t.incomeUnit : t.yieldUnit
  const hasError = manifest.error || geometry.error || results.error || conversion.error
  const loading = !manifest.data || !geometry.data || !displayData
  const colors = metric === 'income' ? incomeMapColors : mapColors
  const facets = economicFacets.slice(0, 4)
  const filtersChanged = facets.some(({ key }) => filters[key] !== emptyEconomicFilters[key])
  const isPlaying = playing && year < 2050
  useEffect(() => {
    if (!isPlaying || loading || hasError) return
    const timer = window.setInterval(() => setYear((current) => current < 2050 ? current + 1 : 2050), 1000)
    return () => window.clearInterval(timer)
  }, [isPlaying, loading, hasError, metric])
  function changeMetric(next: MapMetric) { setMetric(next) }
  function changeFilter(index: number, value: string) {
    const next = { ...filters, [facets[index].key]: value }
    for (const facet of facets.slice(index + 1)) next[facet.key] = 'all'
    const nextCodes = new Set(filterEconomicRows(mapRows, next).map((row) => row.code))
    if (!manifest.data?.scenarios.some((scenario) => nextCodes.has(scenario.code) && scenario.seasons >= season)) setSeason(0)
    setFilters(next); setPlaying(false)
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
      {filtersChanged && <button type="button" className="map-filter-reset" title={filterText.reset} onClick={() => { setFilters(emptyEconomicFilters); setPlaying(false) }}>{filterText.reset}<span aria-hidden="true"> ↺</span></button>}
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
      <div className="map-explorer-grid" aria-busy={loading && !hasError}>
        <div className="map-visual-column">
          <div className="map-canvas-container">
            {geometry.data ? <PlotMap
  geometry={geometry.data}
  adminBoundaries={adminBoundaries.data}
  values={values}
  metric={metric}
  breaks={breaks}
  colors={colors}
  language={language}
  yieldValues={yieldValues}
  incomeValues={incomeValues}
/> : <div className="map-canvas-skeleton" />}
            {loading && !hasError && <div className="map-loading-overlay" role="status">{t.loading}</div>}
          </div>
          <div className="map-legend" aria-label={`${t.legendTitle} ${t[metric]} (${unit})`}><div className="map-legend-title"><strong>{t.legendTitle} {t[metric]}</strong><span>{unit}</span></div>
            <div className="map-legend-steps">{colors.map((color, index) => <div key={color}><span style={{ background: color }} /><small title={breaks.length ? `${formatLegendValue(breaks[index])} – ${formatLegendValue(breaks[index + 1])}` : undefined}>{breaks.length ? `${formatLegendValue(breaks[index])} – ${formatLegendValue(breaks[index + 1])}` : '-'}</small></div>)}</div>
            <p>{t.legendNote}</p>
          </div>
          <p className="map-interaction-help" id="map-interaction-help">{t.instructions}</p>
        </div>

      </div>
    </section>
  </div>
}
