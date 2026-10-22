import { parseCsv } from '../../utils/csv.ts'
import type { EconomicClimate, EconomicGroup } from './economicsData.ts'

export const comparisonMetrics = ['income', 'straw', 'cost', 'yield', 'labor'] as const
export type ComparisonMetric = typeof comparisonMetrics[number]
export type ComparisonClimate = 'all' | EconomicClimate
export type ComparisonResource = 'all' | 'normal' | 'shortage'
export type ComparisonValues = Record<ComparisonMetric, number | null>
export interface ComparisonGroup {
  count: number
  USD: ComparisonValues
  VND: ComparisonValues
}
export interface ComparisonCohort {
  climate: ComparisonClimate
  resource: ComparisonResource
  groups: Record<EconomicGroup, ComparisonGroup>
}
export interface EconomicComparisonData {
  startYear: number
  endYear: number
  cohorts: ComparisonCohort[]
}

const startYear = 2027
const endYear = 2050
const climates: ComparisonClimate[] = ['all', 'severe', 'mild']
const resources: ComparisonResource[] = ['all', 'shortage', 'normal']
const groups: EconomicGroup[] = ['bau', 'oneMha']
const columns: Record<ComparisonMetric, string> = { income: 'Net Income', straw: 'Straw Value', cost: 'Production Cost', yield: 'Avg Yield', labor: 'Labor Intensity' }
type Accumulator = { count: number; metrics: Record<ComparisonMetric, { sum: number; count: number }> }
const key = (climate: ComparisonClimate, resource: ComparisonResource, group: EconomicGroup) => `${climate}:${resource}:${group}`

function category<T extends string>(value: string, mapping: Record<string, T>): T {
  if (!(value in mapping)) throw new Error(`Economic comparison CSV contains an unknown category: ${value}`)
  return mapping[value]
}

function aggregate(source: string) {
  const [headers, ...records] = parseCsv(source)
  const required = ['datetime', 'Scenario Group', 'Climate Type', 'Resource Scenario', ...Object.values(columns)]
  if (!headers || required.some((column) => !headers.includes(column))) throw new Error('Economic comparison CSV is missing required columns.')
  const indexes = Object.fromEntries(required.map((column) => [column, headers.indexOf(column)]))
  const buckets = new Map<string, Accumulator>()
  for (const climate of climates) for (const resource of resources) for (const group of groups) {
    buckets.set(key(climate, resource, group), { count: 0, metrics: Object.fromEntries(comparisonMetrics.map((metric) => [metric, { sum: 0, count: 0 }])) as Accumulator['metrics'] })
  }
  for (const record of records) {
    if (record.length !== headers.length) throw new Error('Economic comparison CSV contains an invalid row.')
    const cell = (column: string) => record[indexes[column]].trim()
    const date = cell('datetime')
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('Economic comparison CSV contains an invalid date.')
    const year = Number(date.slice(0, 4))
    if (year < startYear || year > endYear) continue
    const group = category<EconomicGroup>(cell('Scenario Group'), { 'Business As Usual': 'bau', 'Thường lệ': 'bau', '1Mha': 'oneMha' })
    const climate = category<EconomicClimate>(cell('Climate Type'), { 'Mild Climate': 'mild', 'Khí hậu ôn hòa': 'mild', 'Serve Climate': 'severe', 'Severe Climate': 'severe', 'Khí hậu khắc nghiệt': 'severe' })
    const resource = category<'normal' | 'shortage'>(cell('Resource Scenario'), { 'Normal Economy': 'normal', 'Nền kinh tế bình thường': 'normal', 'Resource Shortage': 'shortage', 'Khan hiếm tài nguyên': 'shortage' })
    const values = Object.fromEntries(comparisonMetrics.map((metric) => {
      const raw = cell(columns[metric])
      const value = raw === '' ? null : Number(raw)
      if (value !== null && !Number.isFinite(value)) throw new Error(`Economic comparison CSV contains a non-finite ${columns[metric]} value.`)
      return [metric, value]
    })) as ComparisonValues
    for (const selectedClimate of ['all', climate] as ComparisonClimate[]) for (const selectedResource of ['all', resource] as ComparisonResource[]) {
      const bucket = buckets.get(key(selectedClimate, selectedResource, group))!
      bucket.count++
      for (const metric of comparisonMetrics) {
        if (values[metric] !== null) { bucket.metrics[metric].sum += values[metric]; bucket.metrics[metric].count++ }
      }
    }
  }
  return buckets
}

export function aggregateEconomicComparison(masterSource: string, combinedSource: string): EconomicComparisonData {
  const usd = aggregate(masterSource)
  const vnd = aggregate(combinedSource)
  if (groups.every((group) => usd.get(key('all', 'all', group))!.count === 0)) throw new Error('Economic comparison CSV has no future records.')
  const means = (bucket: Accumulator): ComparisonValues => Object.fromEntries(comparisonMetrics.map((metric) => [metric, bucket.metrics[metric].count ? bucket.metrics[metric].sum / bucket.metrics[metric].count : null])) as ComparisonValues
  return {
    startYear, endYear,
    cohorts: climates.flatMap((climate) => resources.map((resource) => ({
      climate, resource,
      groups: Object.fromEntries(groups.map((group) => {
        const master = usd.get(key(climate, resource, group))!
        const combined = vnd.get(key(climate, resource, group))!
        if (master.count !== combined.count) throw new Error(`Economic comparison sources do not match for ${key(climate, resource, group)}.`)
        return [group, { count: master.count, USD: means(master), VND: means(combined) }]
      })) as ComparisonCohort['groups'],
    }))),
  }
}

export function selectComparisonCohort(data: EconomicComparisonData, climate: ComparisonClimate, resource: ComparisonResource) {
  return data.cohorts.find((cohort) => cohort.climate === climate && cohort.resource === resource)
}
