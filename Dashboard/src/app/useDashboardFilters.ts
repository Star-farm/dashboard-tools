import { useState } from 'react'
import { emptyEconomicFilters } from '../features/economics/economicsData'
import type { EconomicFilters } from '../features/economics/economicsData'
import { readMapContext } from './mapNavigation'

export function useDashboardFilters() {
  const [scope, setScope] = useState(readMapContext)
  const [filters, update] = useState<EconomicFilters>(() => scope?.filters ?? emptyEconomicFilters)
  function setFilters(next: EconomicFilters) {
    update(next)
    setScope(undefined)
  }
  return { filters, setFilters, scope }
}
