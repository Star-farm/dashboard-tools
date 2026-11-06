import type { SeasonalMetric, SeasonalRow } from './seasonalData'

export type SeasonalYear = number | 'all'

// Each available year has equal weight; crops and conditions stay separate.
export function averageSeasonalYears(rows: SeasonalRow[]): SeasonalRow[] {
  const groups = new Map<string, SeasonalRow[]>()
  for (const row of rows) {
    const key = `${row.code}:${row.family}:${row.condition}:${row.period}`
    const group = groups.get(key) ?? []
    group.push(row)
    groups.set(key, group)
  }
  return [...groups.values()].map((group) => {
    const average = (currency: 'USD' | 'VND'): SeasonalRow['USD'] => {
      const metrics = [...new Set(group.flatMap((row) => Object.keys(row[currency])))] as SeasonalMetric[]
      return Object.fromEntries(metrics.map((metric) => {
        const values = group.flatMap((row) => row[currency][metric] == null ? [] : [row[currency][metric]!.mean])
        return [metric, values.length ? { mean: values.reduce((sum, value) => sum + value, 0) / values.length } : null]
      }))
    }
    return { ...group[0], awd: group.every((row) => row.awd === group[0].awd) ? group[0].awd : 'mixed', USD: average('USD'), VND: average('VND') }
  })
}
