export function yearTicks(startYear: number, endYear: number, width: number, reservedWidth: number): number[] {
  if (!Number.isFinite(startYear) || !Number.isFinite(endYear) || endYear < startYear) return []
  const intervals = Math.max(1, Math.floor((width - reservedWidth) / 56))
  const step = Math.max(1, Math.ceil((endYear - startYear) / intervals))

  return Array.from({ length: Math.floor((endYear - startYear) / step) + 1 }, (_, index) => startYear + index * step)
}
