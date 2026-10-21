import { parseCsv } from '../../utils/csv.ts'
import { scenarioMetrics } from './scenarioTypes.ts'
import type { ScenarioData, ScenarioFamily, ScenarioMetric, ScenarioSnapshot } from './scenarioTypes.ts'

interface Bucket {
  name: string
  count: number
  withAwd: number
  withoutAwd: number
  metrics: Record<ScenarioMetric, { sum: number; count: number }>
}

function bucket(name = ''): Bucket {
  return { name, count: 0, withAwd: 0, withoutAwd: 0, metrics: Object.fromEntries(scenarioMetrics.map(({ id }) => [id, { sum: 0, count: 0 }])) as Bucket['metrics'] }
}

function snapshot(current: Bucket): ScenarioSnapshot {
  return {
    count: current.count,
    withAwd: current.withAwd,
    withoutAwd: current.withoutAwd,
    values: Object.fromEntries(scenarioMetrics.map(({ id }) => [id, current.metrics[id].count ? current.metrics[id].sum / current.metrics[id].count : null])) as ScenarioSnapshot['values'],
  }
}

function aggregate(source: string) {
  const [headers, ...rows] = parseCsv(source)
  const required = ['datetime', 'Scenario Code', 'Scenario Name', 'AWD Adoption', ...scenarioMetrics.flatMap(({ column }) => column ? [column] : [])]
  if (!headers || required.some((column) => !headers.includes(column))) throw new Error('Scenario CSV is missing required columns.')
  const columns = Object.fromEntries(required.map((column) => [column, headers.indexOf(column)]))
  const scenarios = new Map<string, Bucket>()
  const baseline = bucket()

  for (const row of rows) {
    if (row.length !== headers.length) throw new Error('Scenario CSV contains an invalid row.')
    const date = row[columns.datetime].trim()
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('Scenario CSV contains an invalid date.')
    const year = Number(date.slice(0, 4))
    const historical = year >= 2016 && year <= 2022
    if (!historical && (year < 2027 || year > 2050)) continue
    const code = row[columns['Scenario Code']].trim()
    const name = row[columns['Scenario Name']].trim()
    if (!code || !name) throw new Error('Scenario CSV is missing scenario identifiers.')
    if (!historical && !scenarios.has(code)) scenarios.set(code, bucket(name))
    const current = historical ? baseline : scenarios.get(code)!
    const values = {} as Record<ScenarioMetric, number | null>
    for (const { id, column } of scenarioMetrics) {
      if (column === null) continue
      const raw = row[columns[column]].trim()
      const value = raw ? Number(raw) : null
      if (value !== null && !Number.isFinite(value)) throw new Error(`Scenario CSV contains a non-finite ${column} value.`)
      values[id] = value
    }
    values.roi = values.income !== null && values.cost !== null && values.cost > 0 ? values.income / values.cost * 100 : null
    for (const { id } of scenarioMetrics) {
      if (values[id] === null) continue
      current.metrics[id].sum += values[id]!
      current.metrics[id].count++
    }
    const awd = row[columns['AWD Adoption']].trim()
    if (['With AWD', 'Sử dụng AWD', 'Có AWD'].includes(awd)) current.withAwd++
    else if (['Without AWD', 'Không có AWD'].includes(awd)) current.withoutAwd++
    else throw new Error('Scenario CSV contains an unknown AWD label.')
    current.count++
  }
  if (!baseline.count || !scenarios.size) throw new Error('Scenario CSV needs both baseline and future records.')
  return { baseline, scenarios }
}

function family(code: string): ScenarioFamily {
  if (code.startsWith('1M-')) return 'oneMha'
  if (code.startsWith('BAU-3V-')) return 'threeSeasons'
  if (code.startsWith('BAU-2V-')) return 'twoSeasons'
  if (code.startsWith('BAU-BV-')) return 'sustainable'
  throw new Error(`Unknown scenario code: ${code}`)
}

export function aggregateScenarioData(masterSource: string, combinedSource: string): ScenarioData {
  const master = aggregate(masterSource)
  const combined = aggregate(combinedSource)
  if (master.baseline.count !== combined.baseline.count || master.scenarios.size !== combined.scenarios.size) throw new Error('Scenario CSV sources do not have matching records.')
  const order: ScenarioFamily[] = ['threeSeasons', 'twoSeasons', 'sustainable', 'oneMha']
  const scenarios = [...master.scenarios.entries()].map(([code, usd]) => {
    const vnd = combined.scenarios.get(code)
    if (!vnd || usd.count !== vnd.count) throw new Error(`Scenario sources do not match for ${code}.`)
    return { code, family: family(code), name: { vi: vnd.name, en: usd.name.replace(/\bServe Climate\b/g, 'Severe Climate') }, USD: snapshot(usd), VND: snapshot(vnd) }
  }).sort((a, b) => order.indexOf(a.family) - order.indexOf(b.family) || a.code.localeCompare(b.code))
  return { period: { start: 2027, end: 2050 }, baselinePeriod: { start: 2016, end: 2022 }, baseline: { USD: snapshot(master.baseline), VND: snapshot(combined.baseline) }, scenarios }
}
