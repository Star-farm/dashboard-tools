export type Currency = 'USD' | 'VND'
export type Metric = 'income' | 'labor' | 'methane'

export interface Pair {
  first: number | null
  second: number | null
}

export interface AnnualSeries {
  year: number
  incomeUsd: Pair
  incomeVnd: Pair
  labor: Pair
  methane: Pair
  counts: { oneMha: number; bau: number; withAwd: number; withoutAwd: number }
}

export interface FutureData {
  startYear: number
  endYear: number
  sources: { USD: string; VND: string }
  recordCounts: { master: number; combined: number }
  annual: AnnualSeries[]
}

export interface ChartPoint extends Pair {
  year: number
}
