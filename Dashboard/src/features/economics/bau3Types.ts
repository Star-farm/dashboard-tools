export const bau3Metrics = ['income', 'yield', 'labor', 'cost', 'margin'] as const
export type Bau3Metric = typeof bau3Metrics[number]
export type BauVariant = 'bau3s' | 'bau2s' | 'bauss'
export type Bau3Family = BauVariant | 'oneMha'
export type Bau3Currency = 'USD' | 'VND'
export const bau3Conditions = ['severeShortage', 'severeNormal', 'mildShortage', 'mildNormal'] as const
export type Bau3Condition = typeof bau3Conditions[number]
export interface Bau3Point extends Record<Bau3Metric, number | null> { year: number; count: number }
export interface Bau3Series { family: Bau3Family; condition: Bau3Condition; USD: Bau3Point[]; VND: Bau3Point[] }
export interface Bau3Data { variant?: BauVariant; startYear: number; endYear: number; series: Bau3Series[] }
