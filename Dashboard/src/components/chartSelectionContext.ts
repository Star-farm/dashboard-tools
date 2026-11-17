import { createContext, useContext, useState } from 'react'

export type Selection = 'all' | 'bau' | 'oneMha' | 'mild' | 'severe' | 'normal' | 'shortage' | 'bau3s' | 'bau2s' | 'bauss' | 'first' | 'second'
export type Scope = 'weather' | 'resource' | 'model' | 'seasonalModel' | 'futureModel' | 'futureAwd'
export type ContextValue = { selections: Record<Scope, Selection>; setSelection: (scope: Scope, value: Selection) => void }
export const ChartSelectionContext = createContext<ContextValue | null>(null)

export function useChartSelection<T extends Selection>(scope: Scope, initial: T): [T, (value: T) => void] {
  const context = useContext(ChartSelectionContext)
  const [local, setLocal] = useState<T>(initial)
  return [context ? context.selections[scope] as T : local, (value) => context ? context.setSelection(scope, value) : setLocal(value)]
}
