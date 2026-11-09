import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { colorBreaks, colorFor, csvForPlots, displayMapCurrency, mean, plotTrend, selectPlotValues } from '../src/features/map/mapData'
import type { MapCurrency, MapGeometry, MapManifest, MapResults, PlotRecord } from '../src/features/map/mapTypes'
import economics from '../src/data/economics-overview.json'

const read = <T,>(file: string) => JSON.parse(readFileSync(resolve('public/map-data', file), 'utf8')) as T
const records: PlotRecord[] = [
  { year: 2027, season: 1, runs: 2, dates: ['02-01'], yield: [0, null, 4], income: [-10, null, 20] },
  { year: 2027, season: 2, runs: 1, dates: ['07-01'], yield: [6, 3, null], income: [20, 0, null] },
  { year: 2028, season: 1, runs: 2, dates: ['02-01'], yield: [9, null, 5], income: [50, null, 30] },
]
const results: MapResults = { id: 'test', runs: 2, records, seeds: {}, sourceRows: 6 }

describe('map aggregation and interpretation', () => {
  it('converts income before aggregation without changing USD inputs, yield, missing values or counts', () => {
    const converted = displayMapCurrency(results, 'VND', 26322)
    expect(converted.records[0].income).toEqual([-263220, null, 526440])
    expect(converted.records[0].yield).toEqual(results.records[0].yield)
    expect(converted.records[0].runs).toBe(2)
    expect(results.records[0].income).toEqual([-10, null, 20])
    expect(selectPlotValues(converted.records, 2027, 0, 'income')).toEqual([0, 0, 526440])
    expect(plotTrend(converted, 1, 'income', 0)[1].value).toBe(50 * 26322)
    expect(displayMapCurrency(results, 'USD', 26322)).toBe(results)
    expect(() => displayMapCurrency(results, 'VND', 0)).toThrow()
    const usdBreaks = colorBreaks(results, 'income')
    const vndBreaks = colorBreaks(converted, 'income')
    expect(colorFor(20, usdBreaks)).toBe(colorFor(20 * 26322, vndBreaks))
  })
  it('weights valid observations, preserves zero and losses, and averages rather than adds harvests', () => {
    expect(selectPlotValues(records, 2027, 0, 'yield')).toEqual([2, 3, 4])
    expect(selectPlotValues(records, 2027, 0, 'income')).toEqual([0, 0, 20])
    expect(selectPlotValues(records, 2027, 1, 'yield')).toEqual([0, null, 4])
    expect(selectPlotValues(records, 2026, 0, 'yield')).toEqual([])
    expect(mean([null, 0, -4])).toBe(-2)
    expect(mean([null])).toBeNull()
  })
  it('uses metric-specific observation counts when a run has missing data', () => {
    const partial = { ...records[0], yieldCounts: [1, 0, 2] }
    expect(selectPlotValues([partial, records[1]], 2027, 0, 'yield')).toEqual([3, 3, 4])
  })
  it('keeps color thresholds across years and separates area trends from the regional mean', () => {
    expect(colorBreaks(results, 'income')).toHaveLength(6)
    expect(colorFor(null, [0, 1, 2, 3, 4, 5])).toBe('#dce1d8')
    expect(colorFor(0, [0, 1, 2, 3, 4, 5])).not.toBe('#dce1d8')
    expect(plotTrend(results, 1, 'yield', 0)).toEqual([{ year: 2027, value: 0 }, { year: 2028, value: 9 }])
    expect(plotTrend(results, 1, 'yield', null)[0].value).toBe(2)
  })
  it('exports identifiers, units, negative values and blanks without inventing zeros', () => {
    const text = csvForPlots([{ id: 0, areaHa: 50, yield: null, income: -12 }], 'bau3-mild-normal', 2027, 0)
    expect(text).toContain('yield_ton_ha,income_usd_ha')
    expect(text).toContain('bau3-mild-normal,2027,all_mean,0,50,,-12')
    const local = csvForPlots([{ id: 0, areaHa: 50, yield: 5, income: -263220.4 }], 'bau3-mild-normal', 2027, 0, 'VND')
    expect(local).toContain('income_vnd_ha')
    expect(local).toContain(',50,5,-263220')
  })
})

describe('packaged map dataset', () => {
  const manifest = read<MapManifest>('manifest.json')
  const geometry = read<MapGeometry>('geometry.json')
  it('provides a conversion verified from paired Dashboard costs', () => {
    const currency = read<MapCurrency>('currency.json')
    expect(currency.sourceCurrency).toBe('USD')
    expect(currency.displayCurrency).toBe('VND')
    expect(currency.vndPerUsd).toBe(26322)
    expect(currency.matchedRecords).toBe(19404)
    expect(currency.basis).toBe('paired-dashboard-production-costs')
  })
  it('contains all 16 scenarios, 992 ordered shapes and the georeferenced raster', () => {
    expect(manifest.scenarios).toHaveLength(16)
    expect(new Set(manifest.scenarios.map((scenario) => scenario.id)).size).toBe(16)
    expect(geometry.plots.map((plot) => plot.id)).toEqual(Array.from({ length: 992 }, (_, i) => i))
    expect(geometry.plots.every((plot) => plot.areaHa > 0 && plot.path.startsWith('M'))).toBe(true)
    expect(geometry.raster.values).toHaveLength(34 * 18)
    expect(geometry.raster.values.every((value) => value >= 0 && value <= 1)).toBe(true)
    expect(geometry.raster.x).toBeCloseTo(0)
    expect(geometry.raster.y).toBeCloseTo(0)
    expect(geometry.raster.cellWidth * 34).toBeCloseTo(geometry.width, 1)
    expect(geometry.raster.cellHeight * 18).toBeCloseTo(geometry.height, 1)
  })
  it.each(manifest.scenarios)('validates $id against Dashboard categories and temporal completeness', (scenario) => {
    const data = read<MapResults>(scenario.file)
    expect(data.id).toBe(scenario.id)
    expect(data.records).toHaveLength(24 * scenario.seasons)
    expect(data.sourceRows).toBe(24 * scenario.seasons * 20 * 2)
    expect(Object.values(data.seeds)).toHaveLength(20)
    expect(Object.values(data.seeds).every((seed) => typeof seed === 'string')).toBe(true)
    expect(data.records.every((record) => record.runs === 20 && record.yield.length === 992 && record.income.length === 992)).toBe(true)
    expect(new Set(data.records.map((record) => `${record.year}:${record.season}`)).size).toBe(data.records.length)
    const reference = economics.find((row) => row.code === scenario.code && !row.historical)
    expect(reference?.group).toBe(scenario.system === 'oneMha' ? 'oneMha' : 'bau')
    expect(reference?.climate).toBe(scenario.climate)
    expect(reference?.resource).toBe(scenario.resource)
  })
})
