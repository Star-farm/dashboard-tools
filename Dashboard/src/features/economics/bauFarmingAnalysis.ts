import type { Language } from '../../i18n'
import { bau3Conditions, bau3Metrics } from './bau3Types'
import type { Bau3Currency, Bau3Data, Bau3Family, Bau3Metric, Bau3Point } from './bau3Types'
import { bau3Text } from './bau3Text'
import { bau3Unit, formatBau3Value } from './bau3Analysis'

function weightedMean(points: Bau3Point[], metric: Bau3Metric): number | null {
  const valid = points.filter((point) => point.count > 0 && point[metric] !== null && Number.isFinite(point[metric]))
  const count = valid.reduce((sum, point) => sum + point.count, 0)
  return count ? valid.reduce((sum, point) => sum + point[metric]! * point.count, 0) / count : null
}

function relativeChange(start: number | null, end: number | null) {
  return start === null || end === null || start === 0 ? null : (end - start) / Math.abs(start) * 100
}

export function bauFarmingStats(data: Bau3Data, metric: Bau3Metric, currency: Bau3Currency, family: Bau3Family = 'bau3s') {
  const series = data.series.filter((item) => item.family === family)
  const points = series.flatMap((item) => item[currency]).filter((point) => point.year >= data.startYear && point.year <= data.endYear)
  const mean = weightedMean(points, metric)
  const start = weightedMean(points.filter((point) => point.year === data.startYear), metric)
  const end = weightedMean(points.filter((point) => point.year === data.endYear), metric)
  const change = metric === 'margin' ? start === null || end === null ? null : end - start : relativeChange(start, end)
  const conditions = bau3Conditions.flatMap((condition) => {
    const values = series.find((item) => item.condition === condition)?.[currency] ?? []
    const first = values.find((point) => point.year === data.startYear)
    const last = values.find((point) => point.year === data.endYear)
    const firstValue = first && first.count > 0 ? first[metric] : null
    const lastValue = last && last.count > 0 ? last[metric] : null
    return firstValue !== null && lastValue !== null && Number.isFinite(firstValue) && Number.isFinite(lastValue)
      ? [{ condition, start: firstValue, end: lastValue, difference: lastValue - firstValue, change: metric === 'margin' ? lastValue - firstValue : relativeChange(firstValue, lastValue) }]
      : []
  })
  return { metric, mean, start, end, change, conditions }
}

export type BauFarmingStats = ReturnType<typeof bauFarmingStats>

export function farmingTone(stats: BauFarmingStats): 'good' | 'bad' | 'neutral' {
  if (stats.change === null || Math.abs(stats.change) < .000001) return 'neutral'
  const prefersHigher = stats.metric !== 'cost' && stats.metric !== 'labor'
  return (stats.change > 0) === prefersHigher ? 'good' : 'bad'
}

export function analyzeBauFarming(data: Bau3Data, metric: Bau3Metric, language: Language, family: Bau3Family = 'bau3s') {
  const stats = bauFarmingStats(data, metric, language === 'vi' ? 'VND' : 'USD', family)
  if (stats.mean === null) return null
  const t = bau3Text[language]
  const vi = language === 'vi'
  const unit = bau3Unit(metric, language)
  const value = (amount: number) => `${formatBau3Value(amount, metric, language)} ${unit}`
  const number = new Intl.NumberFormat(language, { maximumFractionDigits: 1 })
  const average = vi
    ? `${t[metric]} bình quân giai đoạn ${data.startYear}–${data.endYear}: ${value(stats.mean)}.`
    : `Average ${t[metric].toLocaleLowerCase(language)} for ${data.startYear}–${data.endYear}: ${value(stats.mean)}.`
  const lower = stats.conditions.filter((condition) => condition.difference < -.000001).length
  const higher = stats.conditions.filter((condition) => condition.difference > .000001).length
  const equal = stats.conditions.length - lower - higher
  const directions = vi
    ? [lower ? `giảm ở ${lower}/${stats.conditions.length} nhóm điều kiện` : '', higher ? `tăng ở ${higher}/${stats.conditions.length} nhóm điều kiện` : '', equal ? `không đổi ở ${equal}/${stats.conditions.length} nhóm điều kiện` : '']
    : [lower ? `decreases in ${lower}/${stats.conditions.length} combinations` : '', higher ? `increases in ${higher}/${stats.conditions.length} combinations` : '', equal ? `is unchanged in ${equal}/${stats.conditions.length} combinations` : '']
  const changes = stats.conditions.flatMap((condition) => condition.change === null ? [] : [condition.change])
  const changeUnit = metric === 'margin' ? vi ? 'điểm %' : 'pp' : '%'
  const range = changes.length ? `${number.format(Math.min(...changes))} ${changeUnit} ${vi ? 'đến' : 'to'} ${number.format(Math.max(...changes))} ${changeUnit}` : null
  const trend = stats.conditions.length ? vi
    ? `So với ${data.startYear}, đến ${data.endYear}, chỉ số ${directions.filter(Boolean).join(', ')}${range ? ` (mức thay đổi: ${range})` : ''}.`
    : `By ${data.endYear}, compared with ${data.startYear}, the indicator ${directions.filter(Boolean).join(', ')}${range ? ` (change: ${range})` : ''}.` : ''
  const sorted = [...stats.conditions].sort((a, b) => a.end - b.end)
  const low = sorted[0], high = sorted.at(-1)
  const endpoints = low && high ? vi
    ? `Năm ${data.endYear}, thấp nhất là “${t[low.condition]}” (${value(low.end)}); cao nhất là “${t[high.condition]}” (${value(high.end)}).`
    : `In ${data.endYear}, the lowest value is “${t[low.condition]}” (${value(low.end)}); the highest is “${t[high.condition]}” (${value(high.end)}).` : ''
  return { ...stats, paragraph: [average, trend, endpoints].filter(Boolean).join(' ') }
}

export function bauFarmingSummary(data: Bau3Data, language: Language, family: Bau3Family = 'bau3s') {
  const vi = language === 'vi'
  const stats = Object.fromEntries(bau3Metrics.map((metric) => [metric, bauFarmingStats(data, metric, vi ? 'VND' : 'USD', family)])) as Record<Bau3Metric, BauFarmingStats>
  if (bau3Metrics.some((metric) => stats[metric].mean === null)) return bau3Text[language].noData
  const value = (metric: Bau3Metric) => `${formatBau3Value(stats[metric].mean!, metric, language)} ${bau3Unit(metric, language)}`
  const model = vi
    ? { bau3s: 'canh tác thường lệ 3 vụ', bau2s: 'canh tác thường lệ 2 vụ', bauss: 'canh tác thường lệ bền vững', oneMha: 'mô hình 1Mha' }[family]
    : { bau3s: 'business as usual with three seasons', bau2s: 'business as usual with two seasons', bauss: 'sustainable business-as-usual farming', oneMha: 'the 1Mha system' }[family]
  const average = vi
    ? `Trong giai đoạn ${data.startYear}–${data.endYear}, ${model} có thu nhập ròng bình quân ${value('income')}, chi phí sản xuất ${value('cost')} và tỷ suất lợi nhuận ${value('margin')}; năng suất đạt ${value('yield')} với cường độ lao động ${value('labor')}.`
    : `Over ${data.startYear}–${data.endYear}, ${model} averages ${value('income')} in net income, ${value('cost')} in production costs and a ${value('margin')} profit margin; yield is ${value('yield')} with labor intensity of ${value('labor')}.`
  const number = new Intl.NumberFormat(language, { maximumFractionDigits: 1 })
  const endChanges = (['income', 'cost', 'yield', 'margin', 'labor'] as const).flatMap((metric) => {
    const change = stats[metric].change
    if (change === null) return []
    const direction = Math.abs(change) < .000001 ? vi ? 'không đổi' : 'is unchanged' : vi ? change > 0 ? 'tăng' : 'giảm' : change > 0 ? 'increases' : 'decreases'
    const amount = Math.abs(change) < .000001 ? '' : ` ${number.format(Math.abs(change))} ${metric === 'margin' ? vi ? 'điểm %' : 'pp' : '%'}`
    return [`${bau3Text[language][metric].toLocaleLowerCase(language)} ${direction}${amount}`]
  }).join('; ')
  const trend = endChanges ? vi ? `So với ${data.startYear}, đến ${data.endYear}, ${endChanges}.` : `By ${data.endYear} compared with ${data.startYear}, ${endChanges}.` : ''
  const incomeEnds = stats.income.conditions
  const shortage = incomeEnds.filter(({ condition }) => condition.endsWith('Shortage'))
  const normal = incomeEnds.filter(({ condition }) => condition.endsWith('Normal'))
  const resourceRisk = shortage.length === 2 && normal.length === 2 && shortage.every((a) => normal.every((b) => a.end < b.end))
  const risk = resourceRisk ? vi
    ? `Các nhóm điều kiện thiếu tài nguyên có thu nhập cuối kỳ thấp hơn cả hai nhóm điều kiện tài nguyên bình thường, cho thấy rủi ro kinh tế cần được xem xét theo từng điều kiện.`
    : `Both resource-shortage combinations have lower end-period income than either normal-resource combination, indicating that economic risk should be assessed for each condition.` : ''
  const conclusion = vi
    ? 'Nhìn chung, cần ưu tiên khả năng sinh lời, ổn định tài nguyên và quản lý chi phí; việc giảm lao động chỉ có ý nghĩa tích cực khi đi cùng năng suất và thu nhập được duy trì.'
    : 'Overall, profitability, reliable resource access and cost management should take priority; lower labor use is beneficial only when yield and income are maintained.'
  return [average, trend, risk, conclusion].filter(Boolean).join(' ')
}

