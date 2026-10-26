import type { Language } from '../../i18n'
import { bau3Conditions } from '../economics/bau3Types'
import type { Bau3Condition, Bau3Family } from '../economics/bau3Types'
import { bau3Text } from '../economics/bau3Text'
import { environmentMetrics } from './environmentTypes'
import type { EnvironmentData, EnvironmentMetric, EnvironmentPoint, EnvironmentSeries } from './environmentTypes'
import { environmentText } from './environmentText'

export const environmentColors = { severeShortage: '#3478c6', severeNormal: '#9362bc', mildShortage: '#ce762b', mildNormal: '#589044' }
export const environmentUnit = (metric: EnvironmentMetric, language: Language) => environmentText[language][`${metric}Unit`]
export const environmentNumber = (value: number, language: Language) => new Intl.NumberFormat(language, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)
export function environmentMean(points: EnvironmentPoint[], metric: EnvironmentMetric): number | null {
  const valid = points.filter((point) => point.values[metric] !== null && point.metricCounts[metric] > 0)
  const count = valid.reduce((sum, point) => sum + point.metricCounts[metric], 0)
  return count ? valid.reduce((sum, point) => sum + point.values[metric]! * point.metricCounts[metric], 0) / count : null
}
export function environmentStats(series: EnvironmentSeries[], metric: EnvironmentMetric, startYear = 2027, endYear = 2050) {
  const points = series.flatMap((item) => item.points).filter((point) => point.year >= startYear && point.year <= endYear)
  const mean = environmentMean(points, metric), start = environmentMean(points.filter((point) => point.year === startYear), metric), end = environmentMean(points.filter((point) => point.year === endYear), metric)
  const change = start === null || end === null || start === 0 ? null : (end - start) / Math.abs(start) * 100
  return { mean, start, end, change }
}
export function environmentAwdStats(series: EnvironmentSeries[], startYear = 2027, endYear = 2050) {
  const points = series.flatMap((item) => item.points).filter((point) => point.year >= startYear && point.year <= endYear)
  const rate = (selected: EnvironmentPoint[]) => {
    const count = selected.reduce((sum, point) => sum + point.count, 0)
    return count ? selected.reduce((sum, point) => sum + point.withAwd, 0) / count * 100 : null
  }
  const mean = rate(points), start = rate(points.filter((point) => point.year === startYear)), end = rate(points.filter((point) => point.year === endYear))
  return { mean, start, end, change: start === null || end === null ? null : end - start }
}
export function environmentDomain(series: EnvironmentSeries[], metric: EnvironmentMetric): [number, number] {
  const values = series.flatMap((item) => item.points.flatMap((point) => point.values[metric] === null ? [] : [point.values[metric]!]))
  if (!values.length) return [0, 1]
  const min = Math.min(...values), max = Math.max(...values), span = max - min || Math.max(1, Math.abs(max) * .1)
  return [min < 0 ? min - span * .1 : Math.max(0, min - span * .1), max + span * .12]
}
export function environmentLinePoints(data: EnvironmentData, family: Bau3Family, metric: EnvironmentMetric) {
  return Array.from({ length: data.endYear - data.startYear + 1 }, (_, index) => {
    const year = data.startYear + index
    return { year, ...Object.fromEntries(bau3Conditions.map((condition) => [condition, data.series.find((item) => item.family === family && item.condition === condition)?.points.find((point) => point.year === year)?.values[metric] ?? null])) } as { year: number } & Record<Bau3Condition, number | null>
  })
}
export function environmentFilteredSeries(data: EnvironmentData, climate: string, resource: string) {
  return data.series.filter(({ condition }) => (climate === 'all' || condition.startsWith(climate)) && (resource === 'all' || condition.endsWith(resource === 'shortage' ? 'Shortage' : 'Normal')))
}
function changeText(change: number | null, language: Language) {
  if (change === null) return language === 'vi' ? 'chưa đủ số liệu để tính tỷ lệ thay đổi' : 'a percentage change cannot be calculated'
  const amount = new Intl.NumberFormat(language, { maximumFractionDigits: 1 }).format(Math.abs(change))
  return language === 'vi' ? Math.abs(change) < .000001 ? 'không đổi' : `${change < 0 ? 'giảm' : 'tăng'} ${amount}%` : Math.abs(change) < .000001 ? 'is unchanged' : `${change < 0 ? 'decreases' : 'increases'} by ${amount}%`
}
export function environmentFamilyInsight(data: EnvironmentData, family: Bau3Family, metric: EnvironmentMetric, language: Language) {
  const t = environmentText[language], names = bau3Text[language], vi = language === 'vi'
  const series = data.series.filter((item) => item.family === family), stats = environmentStats(series, metric, data.startYear, data.endYear)
  if (stats.mean === null) return t.noData
  const amount = (value: number) => `${environmentNumber(value, language)} ${environmentUnit(metric, language)}`
  const ends = series.flatMap((item) => { const value = item.points.find((point) => point.year === data.endYear)?.values[metric]; return value === null || value === undefined ? [] : [{ condition: item.condition, value }] }).sort((a, b) => a.value - b.value)
  const low = ends[0], high = ends.at(-1)
  const trend = vi ? `Trong ${data.startYear}–${data.endYear}, ${t[metric].toLocaleLowerCase(language)} bình quân của ${t[family]} đạt ${amount(stats.mean)}; năm ${data.endYear} ${changeText(stats.change, language)} so với ${data.startYear}.` : `Over ${data.startYear}–${data.endYear}, ${t[family]} averages ${amount(stats.mean)} for ${t[metric].toLocaleLowerCase(language)}; by ${data.endYear} compared with ${data.startYear}, the indicator ${changeText(stats.change, language)}.`
  const range = low && high ? vi ? `cuôi giai đoạn, “${names[low.condition]}” đạt ${amount(low.value)}, còn “${names[high.condition]}” đạt ${amount(high.value)}.` : `At the end of the period, “${names[low.condition]}” reaches ${amount(low.value)}, versus ${amount(high.value)} for “${names[high.condition]}”.` : ''
  return [trend, range, t[`${metric}Conclusion`]].filter(Boolean).join(' ')
}
export function environmentComparisonInsight(data: EnvironmentData, selected: EnvironmentSeries[], metric: EnvironmentMetric, language: Language, family?: Bau3Family) {
  const t = environmentText[language], vi = language === 'vi'
  const baseline = selected.filter((item) => family ? item.family === family : item.family !== 'oneMha')
  const one = selected.filter((item) => item.family === 'oneMha')
  const a = environmentStats(baseline, metric, data.startYear, data.endYear).mean, b = environmentStats(one, metric, data.startYear, data.endYear).mean
  if (a === null || b === null) return t.noData
  const name = family ? t[family] : t.bau
  const relative = a === 0 ? null : (b - a) / Math.abs(a) * 100
  const number = new Intl.NumberFormat(language, { maximumFractionDigits: 1 })
  const comparison = relative === null ? vi ? `chênh lệch ${environmentNumber(b - a, language)} ${environmentUnit(metric, language)}` : `a difference of ${environmentNumber(b - a, language)} ${environmentUnit(metric, language)}` : Math.abs(relative) < .000001 ? vi ? 'tương đương' : 'similar levels' : vi ? `${b < a ? 'thấp hơn' : 'cao hơn'} ${number.format(Math.abs(relative))}%` : `${number.format(Math.abs(relative))}% ${b < a ? 'lower' : 'higher'} levels`
  const differences = bau3Conditions.flatMap((condition) => {
    const left = baseline.filter((item) => item.condition === condition).flatMap((item) => item.points)
    const right = one.filter((item) => item.condition === condition).flatMap((item) => item.points)
    const leftYears = new Set(left.filter((point) => point.values[metric] !== null && point.metricCounts[metric] > 0).map((point) => point.year))
    const shared = new Set(right.filter((point) => leftYears.has(point.year) && point.values[metric] !== null && point.metricCounts[metric] > 0).map((point) => point.year))
    const x = environmentMean(left.filter((point) => shared.has(point.year)), metric), y = environmentMean(right.filter((point) => shared.has(point.year)), metric)
    return x === null || y === null ? [] : [y - x]
  })
  const lower = differences.filter((difference) => difference < -.000001).length, higher = differences.filter((difference) => difference > .000001).length, equal = differences.length - lower - higher
  const directions = vi ? [lower ? `thấp hơn ở ${lower}/${differences.length} nhóm điều kiện` : '', higher ? `cao hơn ở ${higher}/${differences.length} nhóm điều kiện` : '', equal ? `tương đương ở ${equal}/${differences.length} nhóm điều kiện` : ''] : [lower ? `lower in ${lower}/${differences.length} combinations` : '', higher ? `higher in ${higher}/${differences.length} combinations` : '', equal ? `similar in ${equal}/${differences.length} combinations` : '']
  const conditions = differences.length ? vi ? ` Xét theo từng nhóm điều kiện thời tiết–tài nguyên có cùng năm quan sát, chỉ số của 1Mha ${directions.filter(Boolean).join(', ')}.` : ` Across weather–resource combinations with matching observation years, the indicator under 1Mha is ${directions.filter(Boolean).join(', ')}.` : ''
  const recommendation = differences.length && lower === differences.length ? vi ? 'Kết quả này ủng hộ ưu tiên 1Mha ở các điều kiện được so sánh. ' : 'These results support prioritizing 1Mha in the compared conditions. ' : ''
  return vi ? `Trong giai đoạn ${data.startYear}–${data.endYear}, ${t[metric].toLocaleLowerCase(language)} bình quân của ${name} là ${environmentNumber(a, language)} ${environmentUnit(metric, language)}, còn 1Mha là ${environmentNumber(b, language)} ${environmentUnit(metric, language)}; 1Mha ${comparison}.${conditions} ${recommendation}${t[`${metric}Conclusion`]}` : `Over ${data.startYear}–${data.endYear}, average ${t[metric].toLocaleLowerCase(language)} is ${environmentNumber(a, language)} ${environmentUnit(metric, language)} for ${name} and ${environmentNumber(b, language)} ${environmentUnit(metric, language)} for 1Mha, with ${comparison} under 1Mha.${conditions} ${recommendation}${t[`${metric}Conclusion`]}`
}
export function environmentSummary(data: EnvironmentData, selected: EnvironmentSeries[], language: Language, family?: Bau3Family, compare = false) {
  const t = environmentText[language], vi = language === 'vi'
  if (environmentMetrics.every((metric) => environmentStats(selected.filter((series) => !family || series.family === family), metric, data.startYear, data.endYear).mean === null)) return t.noData
  const parts = environmentMetrics.map((metric) => {
    const stats = environmentStats(selected.filter((series) => !family || series.family === family), metric, data.startYear, data.endYear)
    if (stats.mean === null) return `${t[metric]}: ${t.noData}`
    return `${t[metric].toLocaleLowerCase(language)} ${environmentNumber(stats.mean, language)} ${environmentUnit(metric, language)}${compare ? '' : ` (${changeText(stats.change, language)})`}`
  })
  const awd = environmentAwdStats(selected.filter((series) => !family || series.family === family), data.startYear, data.endYear)
  const rate = (value: number | null) => value === null ? t.noData : `${environmentNumber(value, language)}%`
  if (compare) {
    const baseRate = environmentAwdStats(selected.filter((series) => family ? series.family === family : series.family !== 'oneMha'), data.startYear, data.endYear).mean
    const oneRate = environmentAwdStats(selected.filter((series) => series.family === 'oneMha'), data.startYear, data.endYear).mean
    const awdText = vi ? `Tỷ lệ áp dụng AWD ở ${family ? t[family] : t.bau} là ${rate(baseRate)}, ở 1Mha là ${rate(oneRate)}.` : `AWD adoption is ${rate(baseRate)} under ${family ? t[family] : t.bau} and ${rate(oneRate)} under 1Mha.`
    return environmentMetrics.map((metric) => environmentComparisonInsight(data, selected, metric, language, family).split('. ').slice(0, 1).join('. ')).join('. ') + `. ${awdText} ${t.conclusion}`
  }
  return vi ? `Trong giai đoạn ${data.startYear}–${data.endYear}, ${family ? t[family] : t.bau} có mức bình quân: ${parts.join('; ')}; tỷ lệ áp dụng AWD ${rate(awd.mean)}. Các mức biến động so sánh năm ${data.endYear} với ${data.startYear}. ${t.conclusion}` : `Over ${data.startYear}–${data.endYear}, ${family ? t[family] : t.bau} averages ${parts.join('; ')}; AWD adoption is ${rate(awd.mean)}. Changes compare ${data.endYear} with ${data.startYear}. ${t.conclusion}`
}
