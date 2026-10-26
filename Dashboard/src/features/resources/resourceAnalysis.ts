import type { Language } from '../../i18n'
import { bau3Conditions } from '../economics/bau3Types'
import type { Bau3Condition, Bau3Family } from '../economics/bau3Types'
import { bau3Text } from '../economics/bau3Text'
import { resourceMetrics } from './resourceTypes'
import type { ResourceData, ResourceMetric, ResourcePoint, ResourceSeries } from './resourceTypes'
import { resourceText } from './resourceText'

export const resourceColors = { severeShortage: '#3478c6', severeNormal: '#9362bc', mildShortage: '#ce762b', mildNormal: '#589044' }
export const resourceUnit = (metric: ResourceMetric, language: Language) => resourceText[language][`${metric}Unit`]
export const resourceNumber = (value: number, language: Language) => new Intl.NumberFormat(language, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)
export function resourceMean(points: ResourcePoint[], metric: ResourceMetric): number | null {
  const valid = points.filter((point) => point.values[metric] !== null && point.metricCounts[metric] > 0)
  const count = valid.reduce((sum, point) => sum + point.metricCounts[metric], 0)
  return count ? valid.reduce((sum, point) => sum + point.values[metric]! * point.metricCounts[metric], 0) / count : null
}
export function resourceStats(series: ResourceSeries[], metric: ResourceMetric, startYear = 2027, endYear = 2050) {
  const points = series.flatMap((item) => item.points).filter((point) => point.year >= startYear && point.year <= endYear)
  const mean = resourceMean(points, metric), start = resourceMean(points.filter((point) => point.year === startYear), metric), end = resourceMean(points.filter((point) => point.year === endYear), metric)
  const change = start === null || end === null || start === 0 ? null : (end - start) / Math.abs(start) * 100
  return { mean, start, end, change }
}
export function resourceDomain(series: ResourceSeries[], metric: ResourceMetric): [number, number] {
  const values = series.flatMap((item) => item.points.flatMap((point) => point.values[metric] === null ? [] : [point.values[metric]!]))
  if (!values.length) return [0, 1]
  const min = Math.min(...values), max = Math.max(...values), span = max - min || Math.max(1, Math.abs(max) * .1)
  return [min < 0 ? min - span * .1 : Math.max(0, min - span * .1), max + span * .12]
}
export function resourceLinePoints(data: ResourceData, family: Bau3Family, metric: ResourceMetric) {
  return Array.from({ length: data.endYear - data.startYear + 1 }, (_, index) => {
    const year = data.startYear + index
    return { year, ...Object.fromEntries(bau3Conditions.map((condition) => [condition, data.series.find((item) => item.family === family && item.condition === condition)?.points.find((point) => point.year === year)?.values[metric] ?? null])) } as { year: number } & Record<Bau3Condition, number | null>
  })
}
export function resourceFilteredSeries(data: ResourceData, climate: string, resource: string) {
  return data.series.filter(({ condition }) => (climate === 'all' || condition.startsWith(climate)) && (resource === 'all' || condition.endsWith(resource === 'shortage' ? 'Shortage' : 'Normal')))
}
function changeText(change: number | null, language: Language) {
  if (change === null) return language === 'vi' ? 'chưa đủ số liệu để tính tỷ lệ thay đổi' : 'a percentage change cannot be calculated'
  const amount = new Intl.NumberFormat(language, { maximumFractionDigits: 1 }).format(Math.abs(change))
  return language === 'vi' ? Math.abs(change) < .000001 ? 'không đổi' : `${change < 0 ? 'giảm' : 'tăng'} ${amount}%` : Math.abs(change) < .000001 ? 'is unchanged' : `${change < 0 ? 'decreases' : 'increases'} by ${amount}%`
}
export function resourceFamilyInsight(data: ResourceData, family: Bau3Family, metric: ResourceMetric, language: Language) {
  const t = resourceText[language], names = bau3Text[language], vi = language === 'vi'
  const series = data.series.filter((item) => item.family === family), stats = resourceStats(series, metric, data.startYear, data.endYear)
  if (stats.mean === null) return t.noData
  const amount = (value: number) => `${resourceNumber(value, language)} ${resourceUnit(metric, language)}`
  const ends = series.flatMap((item) => { const value = item.points.find((point) => point.year === data.endYear)?.values[metric]; return value === null || value === undefined ? [] : [{ condition: item.condition, value }] }).sort((a, b) => a.value - b.value)
  const low = ends[0], high = ends.at(-1)
  const trend = vi ? `Trong ${data.startYear}–${data.endYear}, ${t[metric].toLocaleLowerCase(language)} bình quân của ${t[family]} đạt ${amount(stats.mean)}; năm ${data.endYear} ${changeText(stats.change, language)} so với ${data.startYear}.` : `Over ${data.startYear}–${data.endYear}, ${t[family]} averages ${amount(stats.mean)} for ${t[metric].toLocaleLowerCase(language)}; by ${data.endYear} compared with ${data.startYear}, the indicator ${changeText(stats.change, language)}.`
  const range = low && high ? vi ? `Cuối giai đoạn, “${names[low.condition]}” đạt ${amount(low.value)}, còn “${names[high.condition]}” đạt ${amount(high.value)}.` : `At the end of the period, “${names[low.condition]}” reaches ${amount(low.value)}, versus ${amount(high.value)} for “${names[high.condition]}”.` : ''
  return [trend, range, t[`${metric}Conclusion`]].filter(Boolean).join(' ')
}
export function resourceComparisonInsight(data: ResourceData, selected: ResourceSeries[], metric: ResourceMetric, language: Language, family?: Bau3Family) {
  const t = resourceText[language], vi = language === 'vi'
  const baseline = selected.filter((item) => family ? item.family === family : item.family !== 'oneMha')
  const one = selected.filter((item) => item.family === 'oneMha')
  const a = resourceStats(baseline, metric, data.startYear, data.endYear).mean, b = resourceStats(one, metric, data.startYear, data.endYear).mean
  if (a === null || b === null) return t.noData
  const name = family ? t[family] : t.bau
  const relative = a === 0 ? null : (b - a) / Math.abs(a) * 100
  const number = new Intl.NumberFormat(language, { maximumFractionDigits: 1 })
  const comparison = relative === null ? vi ? `chênh lệch ${resourceNumber(b - a, language)} ${resourceUnit(metric, language)}` : `a difference of ${resourceNumber(b - a, language)} ${resourceUnit(metric, language)}` : Math.abs(relative) < .000001 ? vi ? 'tương đương nhau' : 'similar use' : vi ? `${b < a ? 'thấp hơn' : 'cao hơn'} ${number.format(Math.abs(relative))}%` : `${number.format(Math.abs(relative))}% ${b < a ? 'lower' : 'higher'} use`
  const differences = bau3Conditions.flatMap((condition) => {
    const left = baseline.filter((item) => item.condition === condition).flatMap((item) => item.points)
    const right = one.filter((item) => item.condition === condition).flatMap((item) => item.points)
    const leftYears = new Set(left.filter((point) => point.values[metric] !== null && point.metricCounts[metric] > 0).map((point) => point.year))
    const shared = new Set(right.filter((point) => leftYears.has(point.year) && point.values[metric] !== null && point.metricCounts[metric] > 0).map((point) => point.year))
    const x = resourceMean(left.filter((point) => shared.has(point.year)), metric), y = resourceMean(right.filter((point) => shared.has(point.year)), metric)
    return x === null || y === null ? [] : [y - x]
  })
  const lower = differences.filter((difference) => difference < -.000001).length, higher = differences.filter((difference) => difference > .000001).length, equal = differences.length - lower - higher
  const directions = vi ? [lower ? `ít hơn ở ${lower}/${differences.length} nhóm điều kiện` : '', higher ? `nhiều hơn ở ${higher}/${differences.length} nhóm điều kiện` : '', equal ? `tương đương ở ${equal}/${differences.length} nhóm điều kiện` : ''] : [lower ? `lower in ${lower}/${differences.length} combinations` : '', higher ? `higher in ${higher}/${differences.length} combinations` : '', equal ? `similar in ${equal}/${differences.length} combinations` : '']
  const conditions = differences.length ? vi ? ` Xét theo từng nhóm điều kiện thời tiết–tài nguyên có cùng năm quan sát, mức sử dụng của 1Mha ${directions.filter(Boolean).join(', ')}.` : ` Across weather–resource combinations with matching observation years, 1Mha use is ${directions.filter(Boolean).join(', ')}.` : ''
  return vi ? `Trong giai đoạn ${data.startYear}–${data.endYear}, ${t[metric].toLocaleLowerCase(language)} bình quân của ${name} là ${resourceNumber(a, language)} ${resourceUnit(metric, language)}, còn 1Mha là ${resourceNumber(b, language)} ${resourceUnit(metric, language)}; 1Mha ${comparison}.${conditions} ${t[`${metric}Conclusion`]}` : `Over ${data.startYear}–${data.endYear}, average ${t[metric].toLocaleLowerCase(language)} is ${resourceNumber(a, language)} ${resourceUnit(metric, language)} for ${name} and ${resourceNumber(b, language)} ${resourceUnit(metric, language)} for 1Mha, with ${comparison} under 1Mha.${conditions} ${t[`${metric}Conclusion`]}`
}
export function resourceSummary(data: ResourceData, selected: ResourceSeries[], language: Language, family?: Bau3Family, compare = false) {
  const t = resourceText[language], vi = language === 'vi'
  if (resourceMetrics.every((metric) => resourceStats(selected.filter((series) => !family || series.family === family), metric, data.startYear, data.endYear).mean === null)) return t.noData
  const parts = resourceMetrics.map((metric) => {
    const stats = resourceStats(selected.filter((series) => !family || series.family === family), metric, data.startYear, data.endYear)
    if (stats.mean === null) return `${t[metric]}: ${t.noData}`
    return `${t[metric].toLocaleLowerCase(language)} ${resourceNumber(stats.mean, language)} ${resourceUnit(metric, language)}${compare ? '' : ` (${changeText(stats.change, language)})`}`
  })
  if (compare) return resourceMetrics.map((metric) => resourceComparisonInsight(data, selected, metric, language, family).split('. ').slice(0, 1).join('. ')).join('. ') + `. ${t.conclusion}`
  return vi ? `Trong giai đoạn ${data.startYear}–${data.endYear}, ${family ? t[family] : t.bau} có mức bình quân: ${parts.join('; ')}. Các mức biến động so sánh năm ${data.endYear} với ${data.startYear}. ${t.conclusion}` : `Over ${data.startYear}–${data.endYear}, ${family ? t[family] : t.bau} averages ${parts.join('; ')}. Changes compare ${data.endYear} with ${data.startYear}. ${t.conclusion}`
}
