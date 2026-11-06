import { createElement } from 'react'
import type { Bau3Condition } from '../features/economics/bau3Types'
import ChartMarker from './ChartMarker'

// Scenario identity stays the same in every annual and seasonal chart.
export const SCENARIO_COLORS = { bau: '#b8322b', oneMha: '#217348' } as const
export const CHART_TICK = { fill: '#30452e', fontSize: 'var(--chart-axis-size)', fontWeight: 500 } as const
export const CHART_TOOLTIP = { background: '#fffefa', color: '#26382e', border: '1px solid #9bac90', borderRadius: 7, fontSize: 'var(--text-body)', lineHeight: 1.7 } as const
export type ChartMarkerShape = 'circle' | 'square' | 'triangle' | 'diamond'
export const CONDITION_MARKERS: Record<Bau3Condition, ChartMarkerShape> = {
  severeShortage: 'circle', severeNormal: 'square', mildShortage: 'triangle', mildNormal: 'diamond',
}
export const CONDITION_COLORS: Record<Bau3Condition, string> = {
  severeShortage: '#2868b2', severeNormal: '#8650a8', mildShortage: '#b65b15', mildNormal: '#287447',
}

export function scenarioColor(family: string) {
  return family === 'oneMha' ? SCENARIO_COLORS.oneMha : SCENARIO_COLORS.bau
}

export function scenarioLineStyle(family: string, condition?: Bau3Condition, compareConditions = false) {
  const color = condition && compareConditions ? CONDITION_COLORS[condition] : scenarioColor(family)
  const shape = condition ? CONDITION_MARKERS[condition] : 'circle'
  const marker = (active: boolean) => ({ cx, cy }: { cx?: number; cy?: number }) => createElement(ChartMarker, { shape, color, cx, cy, active })
  return {
    stroke: color, strokeWidth: 3, strokeOpacity: 1,
    strokeDasharray: family === 'oneMha' ? undefined : '6 4',
    dot: marker(false), activeDot: marker(true),
  }
}
