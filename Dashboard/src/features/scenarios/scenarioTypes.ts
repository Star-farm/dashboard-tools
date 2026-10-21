export const scenarioMetrics = [
  { id: 'income', column: 'Net Income', kind: 'money', preferred: 'higher' },
  { id: 'straw', column: 'Straw Value', kind: 'money', preferred: 'higher' },
  { id: 'cost', column: 'Production Cost', kind: 'money', preferred: 'lower' },
  { id: 'labor', column: 'Labor Intensity', kind: 'labor', preferred: 'lower' },
  { id: 'yield', column: 'Avg Yield', kind: 'yield', preferred: 'higher' },
  { id: 'margin', column: 'Profit Margin', kind: 'percentage', preferred: 'higher' },
  { id: 'roi', column: null, kind: 'percentage', preferred: 'higher' },
  { id: 'water', column: 'Water Usage', kind: 'water', preferred: 'lower' },
  { id: 'fertilizer', column: 'Fertilizer Usage', kind: 'fertilizer', preferred: 'lower' },
  { id: 'pesticides', column: 'Pesticide Usage', kind: 'pesticides', preferred: 'lower' },
  { id: 'methane', column: 'Methane Emissions', kind: 'methane', preferred: 'lower' },
  { id: 'intensity', column: 'Emission Intensity', kind: 'intensity', preferred: 'lower' },
] as const

export type ScenarioMetric = typeof scenarioMetrics[number]['id']
export type ScenarioFamily = 'threeSeasons' | 'twoSeasons' | 'sustainable' | 'oneMha'
export interface ScenarioSnapshot {
  count: number
  values: Record<ScenarioMetric, number | null>
  withAwd: number
  withoutAwd: number
}
export interface ScenarioRecord {
  code: string
  name: { vi: string; en: string }
  family: ScenarioFamily
  USD: ScenarioSnapshot
  VND: ScenarioSnapshot
}
export interface ScenarioData {
  period: { start: number; end: number }
  baselinePeriod: { start: number; end: number }
  baseline: { USD: ScenarioSnapshot; VND: ScenarioSnapshot }
  scenarios: ScenarioRecord[]
}
