import type { EconomicRow } from '../economics/economicsData'
import type { Bau3Condition, Bau3Family } from '../economics/bau3Types'

export const environmentMetrics = ['intensity', 'methane'] as const
export type EnvironmentMetric = typeof environmentMetrics[number]
export type EnvironmentValues = Record<EnvironmentMetric, number | null>
export type EnvironmentCounts = Record<EnvironmentMetric, number>
export interface EnvironmentSnapshot { values: EnvironmentValues; metricCounts: EnvironmentCounts; count: number; withAwd: number }
export interface EnvironmentPoint extends EnvironmentSnapshot { year: number }
export interface EnvironmentSeries { family: Bau3Family; condition: Bau3Condition; points: EnvironmentPoint[] }
export interface EnvironmentRow extends Omit<EconomicRow, 'USD' | 'VND'>, EnvironmentSnapshot {}
export interface EnvironmentData { startYear: number; endYear: number; rows: EnvironmentRow[]; series: EnvironmentSeries[] }
