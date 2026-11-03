import { parseCsv } from '../../utils/csv.ts'
import { bau3Conditions } from './bau3Types.ts'
import type { Bau3Condition } from './bau3Types.ts'
import type { Bau3Family } from './bau3Types.ts'
import { scenarioMetrics } from '../scenarios/scenarioTypes.ts'
import type { ScenarioMetric } from '../scenarios/scenarioTypes.ts'
import type { EconomicRow, EconomicFilters } from './economicsData.ts'

export const cropPeriods = ['early', 'middle', 'late'] as const
export type CropPeriod = typeof cropPeriods[number]
export type SeasonalMetric = ScenarioMetric | 'awd'
export type SeasonalFamily = Bau3Family
export type SeasonalTopic = 'economics' | 'resources' | 'environment' | 'all'
export interface SeasonalConfig { topic: SeasonalTopic; kind: 'overview' | 'comparison' | 'family'; family?: SeasonalFamily; scenarioCode?: string; metrics?: SeasonalMetric[] }
export const seasonalMetricGroups: Record<SeasonalTopic, SeasonalMetric[]> = {
  economics: ['income', 'cost', 'straw', 'roi', 'margin', 'yield', 'labor'],
  resources: ['water', 'fertilizer', 'pesticides'],
  environment: ['methane', 'intensity', 'awd'],
  all: [...scenarioMetrics.map((metric) => metric.id), 'awd'],
}
export const cropFamilies: SeasonalFamily[] = ['bau3s', 'bau2s', 'bauss', 'oneMha']
export const cultivatedPeriods = (family: SeasonalFamily) => family === 'oneMha' || family === 'bau2s' ? cropPeriods.slice(0, 2) : [...cropPeriods]
export interface SeasonalStats { mean: number }
export interface SeasonalRow extends Pick<EconomicRow, keyof EconomicFilters> {
  code: string
  family: SeasonalFamily
  condition: Bau3Condition
  year: number
  period: CropPeriod
  USD: Partial<Record<SeasonalMetric, SeasonalStats | null>>
  VND: Partial<Record<SeasonalMetric, SeasonalStats | null>>
}
export interface SeasonalData { startYear: number; endYear: number; rows: SeasonalRow[] }
export interface PackedSeasonalData {
  startYear: number; endYear: number; metrics: SeasonalMetric[]
  rows: [code: string, family: number, condition: number, year: number, period: number, awd: number, usd: (number | null)[], vnd: (number | null)[]][]
}

// Source timestamps identify Winter–Spring, Summer–Fall, and Fall–Winter crops.
function recordingPeriod(month: number): CropPeriod {
  return month <= 4 ? 'early' : month <= 9 ? 'middle' : 'late'
}

function summarize(values: number[]): SeasonalStats | null {
  if (!values.length) return null
  return { mean: values.reduce((sum, value) => sum + value, 0) / values.length }
}

function aggregate(source: string) {
  const [headers, ...records] = parseCsv(source)
  const required = ['datetime', 'Scenario Group', 'Season Type', 'Climate Type', 'Resource Scenario', 'Net Income', 'Avg Yield']
  if (!headers || required.some((column) => !headers.includes(column))) throw new Error('Seasonal CSV is missing required columns.')
  const indexes = Object.fromEntries(headers.map((column, index) => [column, index]))
  const buckets = new Map<string, Pick<SeasonalRow, 'family' | 'condition' | 'year' | 'period' | 'code'> & { dates: [string, string]; values: Record<SeasonalMetric, number[]>; count: number }>()
  for (const record of records) {
    if (record.length !== headers.length) throw new Error('Seasonal CSV contains an invalid row.')
    const cell = (column: string) => record[indexes[column]].trim()
    const date = cell('datetime'), year = Number(date.slice(0, 4)), month = Number(date.slice(5, 7))
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || month < 1 || month > 12 || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date) throw new Error('Seasonal CSV contains an invalid date.')
    if (year < 2027 || year > 2050) continue
    const group = cell('Scenario Group')
    const system = cell('Season Type')
    const family: SeasonalFamily | null = group === '1Mha' ? 'oneMha' : !['Business As Usual', 'Thường lệ'].includes(group) ? null : ['3 Seasons', '3 vụ'].includes(system) ? 'bau3s' : ['2 Seasons', '2 vụ'].includes(system) ? 'bau2s' : ['Sustainable', 'Bền vững'].includes(system) ? 'bauss' : null
    if (!family) continue
    const climate = cell('Climate Type'), resource = cell('Resource Scenario')
    const mild = ['Mild Climate', 'Khí hậu ôn hòa'].includes(climate)
    if (!mild && !['Serve Climate', 'Severe Climate', 'Khí hậu khắc nghiệt'].includes(climate)) throw new Error('Seasonal CSV contains unknown weather.')
    const shortage = ['Resource Shortage', 'Khan hiếm tài nguyên'].includes(resource)
    if (!shortage && !['Normal Economy', 'Nền kinh tế bình thường'].includes(resource)) throw new Error('Seasonal CSV contains unknown resources.')
    const condition: Bau3Condition = mild ? shortage ? 'mildShortage' : 'mildNormal' : shortage ? 'severeShortage' : 'severeNormal'
    const period = recordingPeriod(month), key = `${family}:${condition}:${year}:${period}`
    if (!buckets.has(key)) buckets.set(key, { family, condition, year, period, dates: [date, date], code: headers.includes('Scenario Code') ? cell('Scenario Code') : `${family}:${condition}`, values: Object.fromEntries(seasonalMetricGroups.all.map((metric) => [metric, [] as number[]])) as Record<SeasonalMetric, number[]>, count: 0 })
    const bucket = buckets.get(key)!
    bucket.count++
    if (date < bucket.dates[0]) bucket.dates[0] = date
    if (date > bucket.dates[1]) bucket.dates[1] = date
    for (const { id: metric, column } of scenarioMetrics) {
      if (!column || !headers.includes(column)) continue
      indexes[column] ??= headers.indexOf(column)
      const raw = cell(column)
      if (raw === '') continue
      const value = Number(raw)
      if (!Number.isFinite(value)) throw new Error(`Seasonal CSV contains a non-finite ${column}.`)
      bucket.values[metric].push(value)
    }
    if (headers.includes('AWD Adoption')) {
      indexes['AWD Adoption'] ??= headers.indexOf('AWD Adoption')
      const awd = cell('AWD Adoption')
      if (!['With AWD', 'Without AWD', 'Sử dụng AWD', 'Có AWD', 'Không có AWD', 'Không sử dụng AWD'].includes(awd)) throw new Error('Seasonal CSV contains unknown AWD adoption.')
      bucket.values.awd.push(['With AWD', 'Sử dụng AWD', 'Có AWD'].includes(awd) ? 100 : 0)
    }
  }
  return buckets
}

export function aggregateSeasonalData(master: string, combined: string): SeasonalData {
  const usd = aggregate(master), vnd = aggregate(combined)
  if (!usd.size || usd.size !== vnd.size) throw new Error('Seasonal sources have different populations.')
  const rows = [...usd.entries()].map(([key, bucket]): SeasonalRow => {
    const other = vnd.get(key)
    if (!other || bucket.count !== other.count || bucket.dates.join() !== other.dates.join()) throw new Error(`Seasonal sources do not match for ${key}.`)
    const values = (source: typeof bucket) => {
      const result = Object.fromEntries(seasonalMetricGroups.all.map((metric) => [metric, summarize(source.values[metric])])) as Record<SeasonalMetric, SeasonalStats | null>
      result.roi = result.income && result.cost && result.cost.mean > 0 ? { mean: result.income.mean / result.cost.mean * 100 } : null
      return result
    }
    const USD = values(bucket), VND = values(other)
    return {
      family: bucket.family, condition: bucket.condition, year: bucket.year, period: bucket.period, code: bucket.code,
      group: bucket.family === 'oneMha' ? 'oneMha' : 'bau', season: bucket.family === 'bauss' ? 'sustainable' : bucket.family === 'bau3s' ? 'threeSeasons' : 'twoSeasons', climate: bucket.condition.startsWith('mild') ? 'mild' : 'severe', resource: bucket.condition.endsWith('Shortage') ? 'shortage' : 'normal', awd: USD.awd?.mean === 100 ? 'with' : USD.awd?.mean === 0 ? 'without' : 'mixed',
      USD, VND,
    }
  })
  rows.sort((a, b) => a.year - b.year || bau3Conditions.indexOf(a.condition) - bau3Conditions.indexOf(b.condition) || cropPeriods.indexOf(a.period) - cropPeriods.indexOf(b.period) || a.family.localeCompare(b.family))
  return { startYear: 2027, endYear: 2050, rows }
}

export function seasonalTopicData(data: SeasonalData, topic: SeasonalTopic): SeasonalData {
  const metrics = seasonalMetricGroups[topic]
  return { ...data, rows: data.rows.map((row) => ({ ...row, ...Object.fromEntries((['USD', 'VND'] as const).map((currency) => [currency, Object.fromEntries(metrics.map((metric) => [metric, row[currency][metric] ?? null]))])) })) }
}

const awdLabels = ['without', 'with', 'mixed'] as const
export function packSeasonalData(data: SeasonalData, topic: SeasonalTopic): PackedSeasonalData {
  const metrics = seasonalMetricGroups[topic]
  return { startYear: data.startYear, endYear: data.endYear, metrics, rows: data.rows.map((row) => [row.code, cropFamilies.indexOf(row.family), bau3Conditions.indexOf(row.condition), row.year, cropPeriods.indexOf(row.period), awdLabels.indexOf(row.awd), metrics.map((metric) => row.USD[metric]?.mean ?? null), metrics.map((metric) => row.VND[metric]?.mean ?? null)]) }
}
export function unpackSeasonalData(data: PackedSeasonalData): SeasonalData {
  return { startYear: data.startYear, endYear: data.endYear, rows: data.rows.map(([code, familyIndex, conditionIndex, year, period, awd, usd, vnd]) => {
    const family = cropFamilies[familyIndex], condition = bau3Conditions[conditionIndex]
    const values = (amounts: (number | null)[]) => Object.fromEntries(data.metrics.map((metric, index) => [metric, amounts[index] == null ? null : { mean: amounts[index] }]))
    return { code, family, condition, year, period: cropPeriods[period], group: family === 'oneMha' ? 'oneMha' : 'bau', season: family === 'bauss' ? 'sustainable' : family === 'bau3s' ? 'threeSeasons' : 'twoSeasons', climate: condition.startsWith('mild') ? 'mild' : 'severe', resource: condition.endsWith('Shortage') ? 'shortage' : 'normal', awd: awdLabels[awd], USD: values(usd), VND: values(vnd) }
  }) }
}
