import type { MapCurrencyCode, MapResults, PlotMetric, PlotRecord } from './mapTypes'

export function displayMapCurrency(results: MapResults, currency: MapCurrencyCode, vndPerUsd: number): MapResults {
  if (currency === 'USD') return results
  if (!Number.isFinite(vndPerUsd) || vndPerUsd <= 0) throw new Error('Invalid map currency conversion')
  return { ...results, records: results.records.map((record) => ({ ...record, income: record.income.map((value) => value === null ? null : value * vndPerUsd) })) }
}

export const mapColors = ['#f1ecc4', '#c6d6a4', '#8eb886', '#508a62', '#254f3d']

export function mean(values: readonly (number | null)[]): number | null {
  const valid = values.filter((value): value is number => value !== null && Number.isFinite(value))
  return valid.length ? valid.reduce((sum, value) => sum + value, 0) / valid.length : null
}

export function selectPlotValues(records: readonly PlotRecord[], year: number, season: number, metric: PlotMetric): (number | null)[] {
  const selected = records.filter((record) => record.year === year && (season === 0 || record.season === season))
  if (!selected.length) return []
  return selected[0][metric].map((_, plot) => {
    let sum = 0
    let count = 0
    for (const record of selected) {
      const value = record[metric][plot]
      const observations = record[`${metric}Counts`]?.[plot] ?? record.runs
      if (value !== null && observations > 0) { sum += value * observations; count += observations }
    }
    return count ? sum / count : null
  })
}

// Quantiles use all years/seasons of the selected scenario. The legend therefore
// stays fixed when the year or harvest changes, so temporal comparisons are valid.
export function colorBreaks(results: MapResults, metric: PlotMetric): number[] {
  const sorted = results.records.flatMap((record) => record[metric]).filter((value): value is number => value !== null && Number.isFinite(value)).sort((a, b) => a - b)
  if (!sorted.length) return []
  return [0, .2, .4, .6, .8, 1].map((quantile) => sorted[Math.min(sorted.length - 1, Math.floor(quantile * (sorted.length - 1)))])
}

export function colorFor(value: number | null, breaks: readonly number[]): string {
  if (value === null || !Number.isFinite(value) || breaks.length !== 6) return '#dce1d8'
  const index = breaks.slice(1, 5).filter((limit) => value > limit).length
  return mapColors[index]
}

export function plotTrend(results: MapResults, season: number, metric: PlotMetric, selected: number | null) {
  return Array.from(new Set(results.records.map((record) => record.year))).sort((a, b) => a - b).map((year) => {
    const values = selectPlotValues(results.records, year, season, metric)
    return { year, value: selected === null ? mean(values) : values[selected] ?? null }
  })
}

export function csvForPlots(values: { id: number; areaHa: number; yield: number | null; income: number | null }[], scenario: string, year: number, season: number, currency: MapCurrencyCode = 'USD') {
  return `\uFEFFscenario,year,harvest,plot_index,area_ha,yield_ton_ha,income_${currency.toLowerCase()}_ha\r\n` + values.map((plot) => [scenario, year, season === 0 ? 'all_mean' : season, plot.id, plot.areaHa, plot.yield ?? '', plot.income === null ? '' : currency === 'VND' ? Math.round(plot.income) : plot.income].join(',')).join('\r\n')
}
