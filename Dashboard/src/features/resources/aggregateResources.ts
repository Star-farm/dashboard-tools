import { parseCsv } from '../../utils/csv.ts'
import { bau3Conditions } from '../economics/bau3Types.ts'
import type { Bau3Condition, Bau3Family } from '../economics/bau3Types.ts'
import type { EconomicAwd, EconomicClimate, EconomicGroup, EconomicResource, EconomicSeason } from '../economics/economicsData.ts'
import { resourceMetrics } from './resourceTypes.ts'
import type { ResourceData, ResourceMetric, ResourceSnapshot, ResourceValues } from './resourceTypes.ts'

const columns: Record<ResourceMetric, string> = { water: 'Water Usage', fertilizer: 'Fertilizer Usage', pesticides: 'Pesticide Usage' }
type Bucket = { count: number; sums: Record<ResourceMetric, number>; counts: Record<ResourceMetric, number> }
type RowBucket = Bucket & { code: string; name: string; group: EconomicGroup; season: EconomicSeason; climate: EconomicClimate; resource: EconomicResource; withAwd: number; historical: boolean; startYear: number; endYear: number }
const bucket = (): Bucket => ({ count: 0, sums: { water: 0, fertilizer: 0, pesticides: 0 }, counts: { water: 0, fertilizer: 0, pesticides: 0 } })
function add(target: Bucket, values: ResourceValues) {
  target.count++
  for (const metric of resourceMetrics) if (values[metric] !== null) { target.sums[metric] += values[metric]; target.counts[metric]++ }
}
function snapshot(target: Bucket): ResourceSnapshot {
  return { count: target.count, metricCounts: target.counts, values: Object.fromEntries(resourceMetrics.map((metric) => [metric, target.counts[metric] ? target.sums[metric] / target.counts[metric] : null])) as ResourceValues }
}
function category<T extends string>(value: string, choices: Record<string, T>): T {
  if (!(value in choices)) throw new Error(`Resource CSV has an unknown category: ${value}`)
  return choices[value]
}
function aggregate(source: string) {
  const [headers, ...records] = parseCsv(source)
  const required = ['datetime', 'Scenario Code', 'Scenario Name', 'Scenario Group', 'Season Type', 'Climate Type', 'Resource Scenario', 'AWD Adoption', ...Object.values(columns)]
  if (!headers || required.some((name) => !headers.includes(name))) throw new Error('Resource CSV is missing required columns.')
  const indexes = Object.fromEntries(required.map((name) => [name, headers.indexOf(name)]))
  const rows = new Map<string, RowBucket>(), annual = new Map<string, Bucket>()
  for (const record of records) {
    if (record.length !== headers.length) throw new Error('Resource CSV has an invalid row.')
    const cell = (name: string) => record[indexes[name]].trim()
    const date = cell('datetime')
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('Resource CSV has an invalid date.')
    const year = Number(date.slice(0, 4)), historical = year >= 2016 && year <= 2022
    if (!historical && (year < 2027 || year > 2050)) continue
    const code = cell('Scenario Code'), name = cell('Scenario Name')
    if (!code || !name) throw new Error('Resource CSV is missing scenario identifiers.')
    const group = category<EconomicGroup>(cell('Scenario Group'), { 'Business As Usual': 'bau', 'Thường lệ': 'bau', '1Mha': 'oneMha' })
    const season = category<EconomicSeason>(cell('Season Type'), { '3 Seasons': 'threeSeasons', '3 vụ': 'threeSeasons', '2 Seasons': 'twoSeasons', '2 vụ': 'twoSeasons', Sustainable: 'sustainable', 'Bền vững': 'sustainable' })
    const climate = category<EconomicClimate>(cell('Climate Type'), { 'Mild Climate': 'mild', 'Khí hậu ôn hòa': 'mild', 'Serve Climate': 'severe', 'Severe Climate': 'severe', 'Khí hậu khắc nghiệt': 'severe' })
    const rawResource = category<EconomicResource>(cell('Resource Scenario'), { 'Normal Economy': 'normal', 'Nền kinh tế bình thường': 'normal', Neutral: 'neutral', 'Trung tính': 'neutral', 'Resource Shortage': 'shortage', 'Khan hiếm tài nguyên': 'shortage' })
    const resource = historical ? 'neutral' : rawResource
    if (!historical && resource === 'neutral') throw new Error('Resource CSV has an unsupported future resource category.')
    const awd = category<'with' | 'without'>(cell('AWD Adoption'), { 'With AWD': 'with', 'Sử dụng AWD': 'with', 'Có AWD': 'with', 'Without AWD': 'without', 'Không có AWD': 'without', 'Không sử dụng AWD': 'without' })
    const values = Object.fromEntries(resourceMetrics.map((metric) => {
      const raw = cell(columns[metric]), value = raw === '' ? null : Number(raw)
      if (value !== null && !Number.isFinite(value)) throw new Error(`Resource CSV has a non-finite ${columns[metric]} value.`)
      return [metric, value]
    })) as ResourceValues
    const id = `${code}:${historical}`
    if (!rows.has(id)) rows.set(id, { ...bucket(), code, name, group, season, climate, resource, withAwd: 0, historical, startYear: year, endYear: year })
    const row = rows.get(id)!
    if (row.group !== group || row.season !== season || row.climate !== climate || row.resource !== resource) throw new Error(`Resource CSV has inconsistent categories for ${code}.`)
    add(row, values)
    row.withAwd += Number(awd === 'with')
    row.startYear = Math.min(row.startYear, year); row.endYear = Math.max(row.endYear, year)
    if (!historical) {
      const family: Bau3Family = group === 'oneMha' ? 'oneMha' : { threeSeasons: 'bau3s' as const, twoSeasons: 'bau2s' as const, sustainable: 'bauss' as const }[season]
      const condition: Bau3Condition = climate === 'mild' ? resource === 'shortage' ? 'mildShortage' : 'mildNormal' : resource === 'shortage' ? 'severeShortage' : 'severeNormal'
      const key = `${family}:${condition}:${year}`
      if (!annual.has(key)) annual.set(key, bucket())
      add(annual.get(key)!, values)
    }
  }
  return { rows, annual }
}
function verify(first: Bucket, second: Bucket | undefined, key: string) {
  if (!second || first.count !== second.count) throw new Error(`Resource sources do not match for ${key}.`)
  for (const metric of resourceMetrics) {
    if (first.counts[metric] !== second.counts[metric] || Math.abs(first.sums[metric] - second.sums[metric]) > Math.max(1e-6, Math.abs(first.sums[metric]) * 1e-8)) throw new Error(`Resource sources have different ${metric} values for ${key}.`)
  }
}
export function aggregateResourceData(master: string, combined: string): ResourceData {
  const first = aggregate(master), second = aggregate(combined)
  if (!first.rows.size || !first.annual.size || first.rows.size !== second.rows.size || first.annual.size !== second.annual.size) throw new Error('Resource sources have different scenarios or no future records.')
  const rows = [...first.rows.entries()].map(([key, row]) => {
    const other = second.rows.get(key)
    verify(row, other, key)
    if (!other || row.group !== other.group || row.season !== other.season || row.climate !== other.climate || row.resource !== other.resource || row.withAwd !== other.withAwd || row.startYear !== other.startYear || row.endYear !== other.endYear) throw new Error(`Resource source categories do not match for ${key}.`)
    const awd: EconomicAwd = row.withAwd === row.count ? 'with' : row.withAwd ? 'mixed' : 'without'
    return { code: row.code, name: { en: row.name.replace(/\bServe Climate\b/g, 'Severe Climate'), vi: other.name }, group: row.group, season: row.season, climate: row.climate, resource: row.resource, awd, historical: row.historical, startYear: row.startYear, endYear: row.endYear, ...snapshot(row) }
  })
  const order = (value: string, values: string[]) => values.indexOf(value)
  rows.sort((a, b) => Number(b.historical) - Number(a.historical) || order(a.group, ['bau', 'oneMha']) - order(b.group, ['bau', 'oneMha']) || order(a.season, ['sustainable', 'threeSeasons', 'twoSeasons']) - order(b.season, ['sustainable', 'threeSeasons', 'twoSeasons']) || order(a.climate, ['mild', 'severe']) - order(b.climate, ['mild', 'severe']) || order(a.resource, ['normal', 'shortage']) - order(b.resource, ['normal', 'shortage']))
  for (const [key, current] of first.annual) verify(current, second.annual.get(key), key)
  const families: Bau3Family[] = ['bau3s', 'bau2s', 'bauss', 'oneMha']
  return { startYear: 2027, endYear: 2050, rows, series: families.flatMap((family) => bau3Conditions.map((condition) => ({ family, condition, points: Array.from({ length: 24 }, (_, index) => ({ year: 2027 + index, ...snapshot(first.annual.get(`${family}:${condition}:${2027 + index}`) ?? bucket()) })) }))) }
}
