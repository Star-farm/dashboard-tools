import type { SeasonalMetric } from './seasonalData'

export const additiveSeasonalMetric = (metric: SeasonalMetric) => ['income', 'cost', 'straw', 'labor', 'water', 'fertilizer', 'pesticides', 'methane'].includes(metric)

export function seasonalComposition(values: (number | null)[]) {
  const complete = values.length > 0 && values.every((value) => value !== null && Number.isFinite(value))
  const sum = complete ? values.reduce<number>((total, value) => total + value!, 0) : null
  const shares = sum !== null && sum > 0 && values.every((value) => value! >= 0)
    ? values.map((value) => value! / sum * 100)
    : null
  return { sum, shares }
}

export function annualSeasonalValue(values: (number | null)[], metric: SeasonalMetric) {
  const { sum } = seasonalComposition(values)
  return sum === null ? null : additiveSeasonalMetric(metric) ? sum : sum / values.length
}
