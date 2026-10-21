import { parseCsv } from '../../utils/csv.ts'
import type { FutureData } from './futureTypes.ts'

export const START_YEAR = 2027
export const END_YEAR = 2050

interface Accumulator { sum: number; count: number }
interface Bucket {
  income: [Accumulator, Accumulator]
  labor: [Accumulator, Accumulator]
  methane: [Accumulator, Accumulator]
  counts: { oneMha: number; bau: number; withAwd: number; withoutAwd: number }
}

function accumulator(): Accumulator { return { sum: 0, count: 0 } }
function bucket(): Bucket {
  return {
    income: [accumulator(), accumulator()],
    labor: [accumulator(), accumulator()],
    methane: [accumulator(), accumulator()],
    counts: { oneMha: 0, bau: 0, withAwd: 0, withoutAwd: 0 },
  }
}

function mean(pair: [Accumulator, Accumulator]) {
  return {
    first: pair[0].count ? pair[0].sum / pair[0].count : null,
    second: pair[1].count ? pair[1].sum / pair[1].count : null,
  }
}

function aggregate(source: string) {
  const [headers, ...rows] = parseCsv(source)
  const required = ['datetime', 'Scenario Group', 'AWD Adoption', 'Net Income', 'Labor Intensity', 'Methane Emissions']
  if (!headers || required.some((column) => !headers.includes(column))) throw new Error('Future CSV is missing required columns.')
  const columns = Object.fromEntries(required.map((column) => [column, headers.indexOf(column)]))
  const years = new Map<number, Bucket>()
  let recordCount = 0

  for (const row of rows) {
    if (row.length !== headers.length) throw new Error('Future CSV contains an invalid row.')
    const date = row[columns.datetime].trim()
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('Future CSV contains an invalid date.')
    const year = Number(date.slice(0, 4))
    if (year < START_YEAR || year > END_YEAR) continue
    const scenario = row[columns['Scenario Group']].trim()
    const awd = row[columns['AWD Adoption']].trim()
    const scenarioIndex = scenario === '1Mha' ? 0 : ['Business As Usual', 'Thường lệ'].includes(scenario) ? 1 : null
    const awdIndex = ['With AWD', 'Sử dụng AWD', 'Có AWD'].includes(awd) ? 0 : ['Without AWD', 'Không có AWD'].includes(awd) ? 1 : null
    if (scenarioIndex === null || awdIndex === null) throw new Error('Future CSV contains an unknown scenario or AWD label.')
    if (!years.has(year)) years.set(year, bucket())
    const current = years.get(year)!
    const values = [
      ['Net Income', current.income[scenarioIndex]],
      ['Labor Intensity', current.labor[scenarioIndex]],
      ['Methane Emissions', current.methane[awdIndex]],
    ] as const
    for (const [column, accumulator] of values) {
      const raw = row[columns[column]].trim()
      if (!raw) continue
      const value = Number(raw)
      if (!Number.isFinite(value)) throw new Error(`Future CSV contains a non-finite ${column} value.`)
      accumulator.sum += value
      accumulator.count++
    }
    current.counts[scenarioIndex === 0 ? 'oneMha' : 'bau']++
    current.counts[awdIndex === 0 ? 'withAwd' : 'withoutAwd']++
    recordCount++
  }
  return { years, recordCount }
}

export function aggregateFutureData(masterSource: string, combinedSource: string): FutureData {
  const master = aggregate(masterSource)
  const combined = aggregate(combinedSource)
  if (!master.recordCount || !combined.recordCount) throw new Error('Future CSV has no records in the future period.')
  return {
    startYear: START_YEAR,
    endYear: END_YEAR,
    sources: { USD: 'STAR_FARM CSV - Master file.csv', VND: 'STAR_FARM CSV - Dữ liệu tổng.csv' },
    recordCounts: { master: master.recordCount, combined: combined.recordCount },
    annual: Array.from({ length: END_YEAR - START_YEAR + 1 }, (_, index) => {
      const year = START_YEAR + index
      const usd = master.years.get(year) ?? bucket()
      const vnd = combined.years.get(year) ?? bucket()
      return { year, incomeUsd: mean(usd.income), incomeVnd: mean(vnd.income), labor: mean(usd.labor), methane: mean(usd.methane), counts: usd.counts }
    }),
  }
}
