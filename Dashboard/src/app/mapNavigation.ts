import { economicFacets } from '../features/economics/economicsText'
import { emptyEconomicFilters } from '../features/economics/economicsData'
import type { EconomicFilters } from '../features/economics/economicsData'

export interface MapNavigationContext {
  filters: EconomicFilters
  year: number
  harvest: number
  codes: string[]
}

export function mapDestination(anchor: string, context: MapNavigationContext): string {
  const params = new URLSearchParams({ from: 'map', year: String(context.year), harvest: String(context.harvest) })
  for (const { key } of economicFacets) params.set(key, context.filters[key])
  params.set('codes', context.codes.join(','))
  return `${anchor}?${params}`
}

export function readMapContext(hash = window.location.hash): MapNavigationContext | undefined {
  const params = new URLSearchParams(hash.split('?')[1] ?? '')
  if (params.get('from') !== 'map') return undefined
  const filters = { ...emptyEconomicFilters }
  for (const { key, options } of economicFacets) {
    const value = params.get(key)
    if (value && options.some((option) => option === value)) filters[key] = value
  }
  const year = Number(params.get('year')), harvest = Number(params.get('harvest'))
  return {
    filters,
    year: Number.isInteger(year) && year >= 2027 && year <= 2050 ? year : 2027,
    harvest: Number.isInteger(harvest) && harvest >= 0 && harvest <= 3 ? harvest : 0,
    codes: [...new Set((params.get('codes') ?? '').split(',').filter((code) => /^[A-Za-z0-9-]{1,40}$/.test(code)))].slice(0, 32),
  }
}

export function mapContextRows<T extends { code: string; historical?: boolean }>(rows: readonly T[], context?: MapNavigationContext): T[] {
  return context ? rows.filter((row) => !row.historical && (!context.codes.length || context.codes.includes(row.code))) : [...rows]
}
