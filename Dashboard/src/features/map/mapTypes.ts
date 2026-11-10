export type MapMetric = 'yield' | 'income'
export type PlotMetric = MapMetric
export type MapSystem = 'bau3' | 'bau2' | 'bauss' | 'oneMha'
export type MapCurrencyCode = 'USD' | 'VND'
export interface MapCurrency { sourceCurrency: 'USD'; displayCurrency: 'VND'; vndPerUsd: number; basis: string; matchedRecords: number }
export interface MapScenario {
  id: string
  system: MapSystem
  climate: 'mild' | 'severe'
  resource: 'normal' | 'shortage'
  code: string
  seasons: number
  runs: number
  file: string
  source: string
  sha256: string
}
export interface MapManifest { plotCount: number; yearStart: number; yearEnd: number; scenarios: MapScenario[]; aggregates?: Record<string, string> }
export interface PlotShape { id: number; record: number; areaHa: number; path: string; center: [number, number] }
export interface MapGeometry {
  width: number
  height: number
  metersPerUnit: number
  crs: string
  bounds: number[]
  sourceSha256: string
  plots: PlotShape[]
  raster: { columns: number; rows: number; values: number[]; x: number; y: number; cellWidth: number; cellHeight: number; resolutionMeters: number[] }
}
export interface PlotRecord {
  year: number
  season: number
  runs: number
  dates: string[]
  yield: (number | null)[]
  income: (number | null)[]
  yieldCounts?: number[]
  incomeCounts?: number[]
}
export interface MapResults { id: string; runs: number; records: PlotRecord[]; seeds: Record<string, string>; sourceRows: number; breaks?: Record<PlotMetric, number[]> }
