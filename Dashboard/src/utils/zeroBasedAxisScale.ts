export function zeroBasedAxisScale(values: Array<number | null | undefined>, segments = 4) {
  const finite = values.filter((value): value is number => value !== null && value !== undefined && Number.isFinite(value))
  if (!finite.length) return { domain: [0, 1] as [number, number], ticks: [0, 0.25, 0.5, 0.75, 1] }

  const min = Math.min(0, ...finite)
  const max = Math.max(0, ...finite)
  if (min === 0 && max === 0) return { domain: [0, 1] as [number, number], ticks: [0, 0.25, 0.5, 0.75, 1] }
  const paddedMin = min < 0 ? min * 1.15 : 0
  const paddedMax = max > 0 ? max * 1.2 : 0
  const rawStep = (paddedMax - paddedMin) / segments || 1
  const magnitude = 10 ** Math.floor(Math.log10(rawStep))
  const step = Math.max(magnitude / 100, Math.ceil(rawStep / magnitude) * magnitude)
  const low = min < 0 ? Math.floor(paddedMin / step) * step : 0
  const high = max > 0 ? Math.ceil(paddedMax / step) * step : 0
  const count = Math.max(1, Math.round((high - low) / step))
  const precision = Math.max(0, Math.min(12, -Math.floor(Math.log10(step)) + 1))
  const factor = 10 ** precision
  const round = (value: number) => Math.round(value * factor) / factor
  const ticks = Array.from({ length: count + 1 }, (_, index) => round(low + index * step))
  return { domain: [round(low), round(high)] as [number, number], ticks }
}
