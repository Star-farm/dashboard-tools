export function lineAxisScale(values: Array<number | null | undefined>) {
  const finite = values.filter((value): value is number => value !== null && value !== undefined && Number.isFinite(value))
  if (!finite.length) return { domain: [0, 1] as [number, number], ticks: [0, 0.2, 0.4, 0.6, 0.8, 1] }

  const min = Math.min(...finite)
  const max = Math.max(...finite)
  const spread = max - min || Math.max(Math.abs(max) * 0.1, 1)
  const padding = spread * 0.1
  const rawStep = (spread + padding * 2) / 5
  const magnitude = 10 ** Math.floor(Math.log10(rawStep))
  const normalizedStep = rawStep / magnitude
  const step = (normalizedStep <= 1 ? 1 : normalizedStep <= 2 ? 2 : normalizedStep <= 2.5 ? 2.5 : normalizedStep <= 5 ? 5 : 10) * magnitude
  const precision = Math.max(0, Math.min(12, -Math.floor(Math.log10(step)) + 1))
  const factor = 10 ** precision
  const round = (value: number) => Math.round(value * factor) / factor
  const low = round(Math.floor((min - padding) / step) * step)
  const high = round(Math.ceil((max + padding) / step) * step)
  const count = Math.max(1, Math.round((high - low) / step))
  const ticks = Array.from({ length: count + 1 }, (_, index) => round(low + index * step))
  return { domain: [low, high] as [number, number], ticks }
}
