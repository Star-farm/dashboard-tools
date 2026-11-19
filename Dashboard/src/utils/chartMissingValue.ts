export const ZERO_BAR_VALUE = 0.000001

export function valueForChart(value: number | null | undefined, bars = false) {
  return value == null ? bars ? ZERO_BAR_VALUE : 0 : value
}

export function displayChartValue(value: number | null | undefined) {
  return value == null || Math.abs(value) <= ZERO_BAR_VALUE ? 0 : value
}
