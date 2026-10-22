import { parseCsv } from '../../utils/csv.ts'

export const economicMetrics = ['income', 'cost', 'straw', 'roi', 'margin', 'yield', 'labor'] as const
export type EconomicMetric = typeof economicMetrics[number]
export type EconomicGroup = 'bau' | 'oneMha'
export type EconomicSeason = 'sustainable' | 'threeSeasons' | 'twoSeasons'
export type EconomicClimate = 'mild' | 'severe'
export type EconomicResource = 'normal' | 'neutral' | 'shortage'
export type EconomicAwd = 'with' | 'without' | 'mixed'
export interface EconomicRow {
  code: string
  name: { vi: string; en: string }
  group: EconomicGroup
  season: EconomicSeason
  climate: EconomicClimate
  resource: EconomicResource
  awd: EconomicAwd
  startYear: number
  endYear: number
  historical: boolean
  count: number
  USD: Record<EconomicMetric, number | null>
  VND: Record<EconomicMetric, number | null>
}
export type EconomicFilters = Record<'group' | 'season' | 'climate' | 'resource' | 'awd', string>
export const emptyEconomicFilters: EconomicFilters = { group: 'all', season: 'all', climate: 'all', resource: 'all', awd: 'all' }

const metricColumns = { income: 'Net Income', cost: 'Production Cost', straw: 'Straw Value', margin: 'Profit Margin', yield: 'Avg Yield', labor: 'Labor Intensity' } as const
const facetColumns = ['Scenario Group', 'Season Type', 'Climate Type', 'Resource Scenario'] as const
type Bucket = {
  code: string; name: string; facets: string[]; startYear: number; endYear: number; historical: boolean; count: number; withAwd: number
  metrics: Record<EconomicMetric, { sum: number; count: number }>
}

function aggregate(source: string) {
  const [headers, ...records] = parseCsv(source)
  const required = ['datetime', 'Scenario Code', 'Scenario Name', 'AWD Adoption', ...facetColumns, ...Object.values(metricColumns)]
  if (!headers || required.some((column) => !headers.includes(column))) throw new Error('Economic CSV is missing required columns.')
  const indexes = Object.fromEntries(required.map((column) => [column, headers.indexOf(column)]))
  const buckets = new Map<string, Bucket>()
  for (const record of records) {
    if (record.length !== headers.length) throw new Error('Economic CSV contains an invalid row.')
    const cell = (column: string) => record[indexes[column]].trim()
    const date = cell('datetime')
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('Economic CSV contains an invalid date.')
    const year = Number(date.slice(0, 4))
    const historical = year >= 2016 && year <= 2022
    if (!historical && (year < 2027 || year > 2050)) continue
    const code = cell('Scenario Code')
    const name = cell('Scenario Name')
    if (!code || !name) throw new Error('Economic CSV is missing scenario identifiers.')
    const facets = facetColumns.map(cell)
    const key = `${code}:${historical ? 'historical' : 'future'}`
    if (!buckets.has(key)) buckets.set(key, { code, name, facets, startYear: year, endYear: year, historical, count: 0, withAwd: 0, metrics: Object.fromEntries(economicMetrics.map((metric) => [metric, { sum: 0, count: 0 }])) as Bucket['metrics'] })
    const bucket = buckets.get(key)!
    if (bucket.facets.some((facet, index) => facet !== facets[index])) throw new Error(`Economic scenario ${code} has inconsistent categories.`)
    const values = {} as Record<EconomicMetric, number | null>
    for (const [metric, column] of Object.entries(metricColumns)) {
      const raw = cell(column)
      const value = raw === '' ? null : Number(raw)
      if (value !== null && !Number.isFinite(value)) throw new Error(`Economic CSV contains a non-finite ${column} value.`)
      values[metric as EconomicMetric] = value
    }
    values.roi = null
    for (const metric of economicMetrics) {
      if (values[metric] !== null) { bucket.metrics[metric].sum += values[metric]; bucket.metrics[metric].count++ }
    }
    const awd = cell('AWD Adoption')
    if (['With AWD', 'Sử dụng AWD', 'Có AWD'].includes(awd)) bucket.withAwd++
    else if (!['Without AWD', 'Không có AWD', 'Không sử dụng AWD'].includes(awd)) throw new Error(`Unknown economic AWD category: ${awd}`)
    bucket.count++
    bucket.startYear = Math.min(bucket.startYear, year)
    bucket.endYear = Math.max(bucket.endYear, year)
  }
  return buckets
}

function category<T extends string>(value: string, mapping: Record<string, T>): T {
  if (!(value in mapping)) throw new Error(`Unknown economic category: ${value}`)
  return mapping[value]
}

export function aggregateEconomicOverview(masterSource: string, combinedSource: string): EconomicRow[] {
  const master = aggregate(masterSource)
  const combined = aggregate(combinedSource)
  if (master.size !== combined.size) throw new Error('Economic CSV sources have different scenarios.')
  const values = (bucket: Bucket): EconomicRow['USD'] => {
    const means = Object.fromEntries(economicMetrics.map((metric) => [metric, bucket.metrics[metric].count ? bucket.metrics[metric].sum / bucket.metrics[metric].count : null])) as EconomicRow['USD']
    // The overview reference uses the ratio of mean income to mean cost.
    means.roi = means.income !== null && means.cost !== null && means.cost > 0 ? means.income / means.cost * 100 : null
    return means
  }
  const rows = [...master.entries()].map(([key, usd]): EconomicRow => {
    const vnd = combined.get(key)
    if (!vnd || usd.count !== vnd.count || usd.withAwd !== vnd.withAwd || usd.startYear !== vnd.startYear || usd.endYear !== vnd.endYear) throw new Error(`Economic sources do not match for ${key}.`)
    return {
      code: usd.code, name: { en: usd.name.replace(/\bServe Climate\b/g, 'Severe Climate'), vi: vnd.name },
      group: category<EconomicGroup>(usd.facets[0], { 'Business As Usual': 'bau', '1Mha': 'oneMha' }),
      season: category<EconomicSeason>(usd.facets[1], { Sustainable: 'sustainable', '3 Seasons': 'threeSeasons', '2 Seasons': 'twoSeasons' }),
      climate: category<EconomicClimate>(usd.facets[2], { 'Mild Climate': 'mild', 'Serve Climate': 'severe', 'Severe Climate': 'severe' }),
      resource: category<EconomicResource>(usd.facets[3], { 'Normal Economy': 'normal', Neutral: 'neutral', 'Resource Shortage': 'shortage' }),
      awd: usd.withAwd === usd.count ? 'with' : usd.withAwd === 0 ? 'without' : 'mixed',
      historical: usd.historical, startYear: usd.startYear, endYear: usd.endYear, count: usd.count, USD: values(usd), VND: values(vnd),
    }
  })
  const groupOrder = ['bau', 'oneMha'], seasonOrder = ['sustainable', 'threeSeasons', 'twoSeasons'], climateOrder = ['mild', 'severe'], resourceOrder = ['normal', 'neutral', 'shortage']
  return rows.sort((a, b) => groupOrder.indexOf(a.group) - groupOrder.indexOf(b.group) || seasonOrder.indexOf(a.season) - seasonOrder.indexOf(b.season) || climateOrder.indexOf(a.climate) - climateOrder.indexOf(b.climate) || resourceOrder.indexOf(a.resource) - resourceOrder.indexOf(b.resource) || a.code.localeCompare(b.code))
}

export function filterEconomicRows(rows: EconomicRow[], filters: EconomicFilters): EconomicRow[] {
  return rows.filter((row) => (Object.keys(filters) as (keyof EconomicFilters)[]).every((key) => filters[key] === 'all' || row[key] === filters[key]))
}
