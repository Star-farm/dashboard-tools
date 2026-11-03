import type { Language } from '../../i18n'
import { scenarioMetricLabels, scenarioText } from '../scenarios/scenarioText'
import { scenarioMetrics } from '../scenarios/scenarioTypes'
import type { SeasonalMetric } from './seasonalData'

export const seasonalLabel = (metric: SeasonalMetric, language: Language) => metric === 'awd' ? scenarioText[language].awd : scenarioMetricLabels[language][metric]
export function seasonalUnit(metric: SeasonalMetric, language: Language) {
  const kind = metric === 'awd' ? 'percentage' : scenarioMetrics.find((item) => item.id === metric)!.kind
  return kind === 'money' ? language === 'vi' ? 'VNĐ/ha' : 'USD/ha' : kind === 'percentage' ? '%' : scenarioText[language][`${kind}Unit`]
}
export function seasonalNumber(value: number, metric: SeasonalMetric, language: Language) {
  const digits = language === 'vi' && ['income', 'cost', 'straw'].includes(metric) ? 0 : 2
  return new Intl.NumberFormat(language, { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(value)
}
export function seasonalChange(from: number, to: number, metric: SeasonalMetric, language: Language) {
  const difference = to - from, equal = Math.abs(difference) < .000001
  const lower = scenarioMetrics.find((item) => item.id === metric)?.preferred === 'lower'
  const tone = equal ? 'neutral' : (difference < 0) === lower ? 'good' : 'bad'
  const amount = equal ? '' : ['roi', 'margin', 'awd'].includes(metric)
    ? `${new Intl.NumberFormat(language, { maximumFractionDigits: 1 }).format(Math.abs(difference))} ${language === 'vi' ? 'điểm %' : 'pp'}`
    : from > 0 ? `${new Intl.NumberFormat(language, { maximumFractionDigits: 1 }).format(Math.abs(difference / from * 100))}%`
      : `${seasonalNumber(Math.abs(difference), metric, language)} ${seasonalUnit(metric, language)}`
  const direction = language === 'vi' ? equal ? 'không đổi' : difference > 0 ? 'tăng' : 'giảm' : equal ? 'unchanged' : difference > 0 ? 'increases' : 'decreases'
  return { tone, text: `${direction}${amount ? ` ${amount}` : ''}` }
}
