import { useState } from 'react'
import type { ReactNode } from 'react'
import { ChartSelectionContext } from './chartSelectionContext'
import type { Scope, Selection } from './chartSelectionContext'

export function ChartSelectionProvider({ children }: { children: ReactNode }) {
  const [selections, setSelections] = useState<Record<Scope, Selection>>({ weather: 'all', resource: 'all', model: 'all', seasonalModel: 'all', futureModel: 'all', futureAwd: 'all' })
  return <ChartSelectionContext.Provider value={{ selections, setSelection: (scope, value) => setSelections((previous) => ({ ...previous, [scope]: value })) }}>{children}</ChartSelectionContext.Provider>
}
