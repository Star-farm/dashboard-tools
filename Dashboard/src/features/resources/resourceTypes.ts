import type { EconomicRow } from '../economics/economicsData'
import type { Bau3Condition, Bau3Family } from '../economics/bau3Types'

export const resourceMetrics = ['water', 'fertilizer', 'pesticides'] as const
export type ResourceMetric = typeof resourceMetrics[number]
export type ResourceValues = Record<ResourceMetric, number | null>
export type ResourceCounts = Record<ResourceMetric, number>
export interface ResourceSnapshot { values: ResourceValues; metricCounts: ResourceCounts; count: number }
export interface ResourcePoint extends ResourceSnapshot { year: number }
export interface ResourceSeries { family: Bau3Family; condition: Bau3Condition; points: ResourcePoint[] }
export interface ResourceRow extends Omit<EconomicRow, 'USD' | 'VND'>, ResourceSnapshot {}
export interface ResourceData { startYear: number; endYear: number; rows: ResourceRow[]; series: ResourceSeries[] }
