import type { Language } from '../../i18n'
import { bau3Conditions } from '../economics/bau3Types'
import type { Bau3Condition, Bau3Family } from '../economics/bau3Types'
import { bau3Text } from '../economics/bau3Text'
import { environmentMetrics } from './environmentTypes'
import type { EnvironmentData, EnvironmentMetric, EnvironmentPoint, EnvironmentSeries } from './environmentTypes'
import { environmentText } from './environmentText'

export const environmentUnit = (metric: EnvironmentMetric, language: Language) => environmentText[language][`${metric}Unit`]
export const environmentNumber = (value: number, language: Language) => new Intl.NumberFormat(language, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)
function environmentMean(points: EnvironmentPoint[], metric: EnvironmentMetric): number | null {
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
  return language === 'vi' ? Math.abs(change) < .000001 ? 'không đổi' : `${change < 0 ? 'giảm' : 'tăng'} ${amount} %` : Math.abs(change) < .000001 ? 'is unchanged' : `${change < 0 ? 'decreases' : 'increases'} by ${amount} %`
}
export function environmentFamilyInsight(data: EnvironmentData, family: Bau3Family, metric: EnvironmentMetric, language: Language) {
  const t = environmentText[language], names = bau3Text[language], vi = language === 'vi'
  const series = data.series.filter((item) => item.family === family), stats = environmentStats(series, metric, data.startYear, data.endYear)
  if (stats.mean === null) return t.noData
  const amount = (value: number) => `${environmentNumber(value, language)} ${environmentUnit(metric, language)}`
  const ends = series.flatMap((item) => { const value = item.points.find((point) => point.year === data.endYear)?.values[metric]; return value === null || value === undefined ? [] : [{ condition: item.condition, value }] }).sort((a, b) => a.value - b.value)
  const low = ends[0], high = ends.at(-1)
  const trend = vi ? `Trong ${data.startYear}–${data.endYear}, ${t[metric].toLocaleLowerCase(language)} của ${t[family]} bình quân là ${amount(stats.mean)}; đến ${data.endYear}, mức này ${changeText(stats.change, language)} so với ${data.startYear}.` : `From ${data.startYear} to ${data.endYear}, average ${t[metric].toLocaleLowerCase(language)} under ${t[family]} was ${amount(stats.mean)}; by ${data.endYear}, it ${changeText(stats.change, language)} compared with ${data.startYear}.`
  const range = low && high ? vi ? `Cuối kỳ, mức thấp nhất là ${names[low.condition]} (${amount(low.value)}), cao nhất là ${names[high.condition]} (${amount(high.value)}).` : `At period end, the lowest value was ${names[low.condition]} (${amount(low.value)}), and the highest was ${names[high.condition]} (${amount(high.value)}).` : ''
  return [trend, range].filter(Boolean).join(' ')
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
  const comparison = relative === null ? vi ? `chênh lệch ${environmentNumber(b - a, language)} ${environmentUnit(metric, language)}` : `a difference of ${environmentNumber(b - a, language)} ${environmentUnit(metric, language)}` : Math.abs(relative) < .000001 ? vi ? 'tương đương' : 'similar levels' : vi ? `${b < a ? 'thấp hơn' : 'cao hơn'} ${number.format(Math.abs(relative))} %` : `${number.format(Math.abs(relative))} % ${b < a ? 'lower' : 'higher'} levels`
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
  const comparisonSummary = vi
    ? `Trong giai đoạn ${data.startYear}–${data.endYear}, ${t[metric].toLocaleLowerCase(language)} bình quân là ${environmentNumber(a, language)} ${environmentUnit(metric, language)} ở ${name} và ${environmentNumber(b, language)} ${environmentUnit(metric, language)} ở 1Mha; 1Mha có mức ${comparison}.`
    : `From ${data.startYear} to ${data.endYear}, average ${t[metric].toLocaleLowerCase(language)} was ${environmentNumber(a, language)} ${environmentUnit(metric, language)} under ${name} and ${environmentNumber(b, language)} ${environmentUnit(metric, language)} under 1Mha; 1Mha had ${comparison}.`
  return `${comparisonSummary}${conditions}`
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
  const rate = (value: number | null) => value === null ? t.noData : `${environmentNumber(value, language)} %`
  if (compare) {
    const baseline = selected.filter((series) => family ? series.family === family : series.family !== 'oneMha')
    const one = selected.filter((series) => series.family === 'oneMha')
    const name = family ? t[family] : t.bau
    const number = new Intl.NumberFormat(language, { maximumFractionDigits: 1 })
    const comparisons = environmentMetrics.flatMap((metric) => {
      const a = environmentStats(baseline, metric, data.startYear, data.endYear).mean
      const b = environmentStats(one, metric, data.startYear, data.endYear).mean
      if (a === null || b === null) return []
      const relative = a === 0 ? null : (b - a) / Math.abs(a) * 100
      const relation = relative === null
        ? vi ? `chênh lệch ${environmentNumber(b - a, language)} ${environmentUnit(metric, language)}` : `a difference of ${environmentNumber(b - a, language)} ${environmentUnit(metric, language)}`
        : Math.abs(relative) < .000001
          ? vi ? 'tương đương' : 'similar'
          : vi ? `1Mha ${b < a ? 'thấp hơn' : 'cao hơn'} ${number.format(Math.abs(relative))} %` : `1Mha is ${number.format(Math.abs(relative))} % ${b < a ? 'lower' : 'higher'}`
      return [`${t[metric].toLocaleLowerCase(language)}: ${environmentNumber(a, language)} / ${environmentNumber(b, language)} ${environmentUnit(metric, language)} (${relation})`]
    })
    const baseRate = environmentAwdStats(baseline, data.startYear, data.endYear).mean
    const oneRate = environmentAwdStats(one, data.startYear, data.endYear).mean
    const awdText = vi ? `AWD: ${rate(baseRate)} ở ${name}, ${rate(oneRate)} ở 1Mha` : `AWD adoption: ${rate(baseRate)} under ${name}, ${rate(oneRate)} under 1Mha`
    const period = vi ? `Giai đoạn ${data.startYear}–${data.endYear}, so sánh ${name} với 1Mha` : `From ${data.startYear} to ${data.endYear}, comparing ${name} with 1Mha`
    return `${period}: ${[...comparisons, awdText].join('; ')}. ${t.conclusion}`
  }
  return vi ? `Trong giai đoạn ${data.startYear}–${data.endYear}, ${family ? t[family] : t.bau} có mức bình quân: ${parts.join('; ')}; tỷ lệ áp dụng AWD ${rate(awd.mean)}. Các mức biến động so sánh năm ${data.endYear} với ${data.startYear}. ${t.conclusion}` : `Over ${data.startYear}–${data.endYear}, ${family ? t[family] : t.bau} has the following period averages: ${parts.join('; ')}; AWD adoption is ${rate(awd.mean)}. Changes compare ${data.endYear} with ${data.startYear}. ${t.conclusion}`
}
