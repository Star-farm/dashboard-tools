import { parseCsv } from '../../utils/csv.ts'
import { bau3Conditions, bau3Metrics } from './bau3Types.ts'
import type { Bau3Condition, Bau3Data, Bau3Family, Bau3Metric, Bau3Point, BauVariant } from './bau3Types.ts'

const startYear = 2027, endYear = 2050
const seasons: Record<BauVariant, string[]> = { bau3s: ['3 Seasons', '3 vụ'], bau2s: ['2 Seasons', '2 vụ'], bauss: ['Sustainable', 'Bền vững'] }
const columns: Record<Bau3Metric, string> = { income: 'Net Income', yield: 'Avg Yield', labor: 'Labor Intensity', cost: 'Production Cost', margin: 'Profit Margin' }
type Bucket = { count: number; values: Record<Bau3Metric, { sum: number; count: number }> }
const key = (family: Bau3Family, condition: Bau3Condition, year: number) => `${family}:${condition}:${year}`

function aggregate(source: string, variant: BauVariant) {
  const [headers, ...records] = parseCsv(source)
  const required = ['datetime', 'Scenario Group', 'Season Type', 'Climate Type', 'Resource Scenario', ...Object.values(columns)]
  if (!headers || required.some((column) => !headers.includes(column))) throw new Error('BAU comparison CSV is missing required columns.')
  const indexes = Object.fromEntries(required.map((column) => [column, headers.indexOf(column)]))
  const buckets = new Map<string, Bucket>()
  for (const record of records) {
    if (record.length !== headers.length) throw new Error('BAU comparison CSV contains an invalid row.')
    const cell = (column: string) => record[indexes[column]].trim()
    const date = cell('datetime')
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('BAU comparison CSV contains an invalid date.')
    const year = Number(date.slice(0, 4))
    if (year < startYear || year > endYear) continue
    const group = cell('Scenario Group')
    if (!['Business As Usual', 'Thường lệ', '1Mha'].includes(group)) throw new Error('BAU comparison CSV contains an unknown scenario group.')
    const family: Bau3Family = group === '1Mha' ? 'oneMha' : variant
    if (family === variant && !seasons[variant].includes(cell('Season Type'))) continue
    const climate = cell('Climate Type'), resource = cell('Resource Scenario')
    const mild = ['Mild Climate', 'Khí hậu ôn hòa'].includes(climate)
    if (!mild && !['Serve Climate', 'Severe Climate', 'Khí hậu khắc nghiệt'].includes(climate)) throw new Error('BAU comparison CSV contains an unknown weather category.')
    const shortage = ['Resource Shortage', 'Khan hiếm tài nguyên'].includes(resource)
    if (!shortage && !['Normal Economy', 'Nền kinh tế bình thường'].includes(resource)) throw new Error('BAU comparison CSV contains an unknown resource category.')
    const condition: Bau3Condition = mild ? shortage ? 'mildShortage' : 'mildNormal' : shortage ? 'severeShortage' : 'severeNormal'
    const id = key(family, condition, year)
    if (!buckets.has(id)) buckets.set(id, { count: 0, values: Object.fromEntries(bau3Metrics.map((metric) => [metric, { sum: 0, count: 0 }])) as Bucket['values'] })
    const bucket = buckets.get(id)!
    bucket.count++
    for (const metric of bau3Metrics) {
      const raw = cell(columns[metric])
      if (raw === '') continue
      const value = Number(raw)
      if (!Number.isFinite(value)) throw new Error(`BAU comparison CSV contains a non-finite ${columns[metric]} value.`)
      bucket.values[metric].sum += value
      bucket.values[metric].count++
    }
  }
  return buckets
}

export function aggregateBauComparisonData(masterSource: string, combinedSource: string, variant: BauVariant): Bau3Data {
  const usd = aggregate(masterSource, variant), vnd = aggregate(combinedSource, variant)
  const families: Bau3Family[] = [variant, 'oneMha']
  if (!usd.size || !vnd.size) throw new Error('BAU comparison CSV has no selected future records.')
  const point = (year: number, bucket?: Bucket): Bau3Point => ({ year, count: bucket?.count ?? 0, ...Object.fromEntries(bau3Metrics.map((metric) => [metric, bucket?.values[metric].count ? bucket.values[metric].sum / bucket.values[metric].count : null])) } as Bau3Point)
  return {
    variant, startYear, endYear,
    series: families.flatMap((family) => bau3Conditions.map((condition) => {
      const USD: Bau3Point[] = [], VND: Bau3Point[] = []
      for (let year = startYear; year <= endYear; year++) {
        const id = key(family, condition, year)
        if ((usd.get(id)?.count ?? 0) !== (vnd.get(id)?.count ?? 0)) throw new Error(`BAU comparison CSV sources do not match for ${id}.`)
        USD.push(point(year, usd.get(id)))
        VND.push(point(year, vnd.get(id)))
      }
      return { family, condition, USD, VND }
    })),
  }
}

export function aggregateBau3Data(masterSource: string, combinedSource: string): Bau3Data {
  return aggregateBauComparisonData(masterSource, combinedSource, 'bau3s')
}
