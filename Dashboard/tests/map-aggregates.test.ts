import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, it, expect } from 'vitest'
import { colorBreaks, displayMapCurrency, selectPlotValues, plotTrend } from '../src/features/map/mapData'
import type { MapManifest, MapResults, PlotMetric } from '../src/features/map/mapTypes'

const read = <T,>(name: string): T => JSON.parse(readFileSync(resolve('public/map-data', name), 'utf8')) as T
const manifest = read<MapManifest>('manifest.json')
const sources = new Map(manifest.scenarios.map(s => [s.file, read<MapResults>(s.file)]))
function equalNumbers(actual: (number | null)[], expected: (number | null)[], context: string) {
  expect(actual.length, context).toBe(expected.length)
  for (let i = 0; i < actual.length; i++) {
    const a = actual[i], b = expected[i]
    if (a === null || b === null) { if (a !== b) throw new Error(`${context} plot ${i}: ${a} != ${b}`); continue }
    if (Math.abs(a - b) > 1e-10 * Math.max(1, Math.abs(b))) throw new Error(`${context} plot ${i}: ${a} != ${b}`)
  }
}

describe('precomputed map aggregates', () => {
  it('preserves weighted plot values, color thresholds, and trends for every packaged combination', () => {
    expect(Object.keys(manifest.aggregates ?? {})).toHaveLength(7)
    for (const [key, file] of Object.entries(manifest.aggregates ?? {})) {
      const originals = key.split('|').map(name => sources.get(name)!)
      const original: MapResults = { id: key, runs: 0, seeds: {}, sourceRows: 0, records: originals.flatMap(item => item.records) }
      const aggregate = read<MapResults>(file)
      for (const currency of ['USD', 'VND'] as const) {
        const before = displayMapCurrency(original, currency, 26322)
        const after = displayMapCurrency(aggregate, currency, 26322)
        for (const metric of ['yield', 'income'] as PlotMetric[]) {
          equalNumbers(colorBreaks(after, metric), colorBreaks(before, metric), `${file} ${currency} ${metric} breaks`)
          for (let season = 0; season <= 3; season++) {
            for (let year = 2027; year <= 2050; year++) {
              equalNumbers(selectPlotValues(after.records, year, season, metric), selectPlotValues(before.records, year, season, metric), `${file} ${currency} ${metric} ${year}/${season}`)
            }
            equalNumbers(plotTrend(after, season, metric, null).map(p => p.value), plotTrend(before, season, metric, null).map(p => p.value), `${file} ${currency} ${metric} trend ${season}`)
          }
        }
      }
    }
  }, 120000)
})
