import { SCENARIO_COLORS } from '../../components/chartStyles'
import type { Language } from '../../i18n'
import type { AnnualSeries, ChartPoint, Currency, Metric } from './futureTypes'
import { futureText } from './futureText'

export const SERIES_COLORS = { first: SCENARIO_COLORS.oneMha, second: SCENARIO_COLORS.bau } as const

export function selectChartPoints(annual: AnnualSeries[], metric: Metric, currency: Currency, start: number, end: number): ChartPoint[] {
  return annual.filter((row) => row.year >= start && row.year <= end).map((row) => ({
    year: row.year,
    ...(metric === 'income' ? currency === 'USD' ? row.incomeUsd : row.incomeVnd : row[metric]),
  }))
}

export function metricUnit(metric: Metric, currency: Currency, language: Language) {
  if (metric === 'income') return currency === 'USD' ? 'USD/ha' : 'VNĐ/ha'
  return metric === 'labor' ? futureText[language].laborUnit : language === 'vi' ? 'kg metan/ha' : 'kg methane/ha'
}

export function formatValue(value: number, metric: Metric, currency: Currency, language: Language) {
  return new Intl.NumberFormat(language, { maximumFractionDigits: metric === 'income' ? currency === 'VND' ? 0 : 2 : 1 }).format(value)
}

function mean(values: (number | null)[]) {
  const valid = values.filter((value): value is number => value !== null && Number.isFinite(value))
  return valid.length ? valid.reduce((sum, value) => sum + value, 0) / valid.length : null
}

export function laborAxisDomain(points: ChartPoint[]): [number, number] {
  const values = points.flatMap(({ first, second }) => [first, second]).filter((value): value is number => value !== null && Number.isFinite(value))
  if (!values.length) return [0, 1]
  const min = Math.min(...values)
  const max = Math.max(...values)
  const padding = Math.max(5, (max - min) * 0.15)
  const step = max - min < 25 ? 5 : 10
  return [Math.floor((min - padding) / step) * step, Math.ceil((max + padding) / step) * step]
}

export function analyzeChart(points: ChartPoint[], metric: Metric, currency: Currency, language: Language) {
  const t = futureText[language]
  const firstLabel = metric === 'methane' ? t.withAwd : t.oneMha
  const secondLabel = metric === 'methane' ? t.withoutAwd : t.bau
  const paired = points.filter((point) => point.first !== null && Number.isFinite(point.first) && point.second !== null && Number.isFinite(point.second))
  const firstMean = mean(paired.map((point) => point.first))
  const secondMean = mean(paired.map((point) => point.second))
  if (firstMean === null || secondMean === null) return null
  const difference = firstMean - secondMean
  const unit = metricUnit(metric, currency, language)
  const format = (value: number) => `${formatValue(value, metric, currency, language)} ${unit}`
  const percent = new Intl.NumberFormat(language, { maximumFractionDigits: 1, signDisplay: 'always' })
  const relativeDifference = secondMean > 0 ? difference / secondMean * 100 : null
  const statistic = relativeDifference !== null ? `${percent.format(relativeDifference)} %` : `${difference > 0 ? '+' : ''}${format(difference)}`
  const direction = difference > 0 ? t.higher : difference < 0 ? t.lower : t.equal
  const years = `${paired.length} ${paired.length === 1 ? 'year' : 'years'}`
  const comparison = language === 'vi'
    ? `Trung bình ${paired.length} năm có dữ liệu của cả hai nhóm, ${firstLabel} ${direction} ${secondLabel}${difference ? ` ${format(Math.abs(difference))}` : ''}.`
    : difference === 0 ? `${firstLabel} and ${secondLabel} have equal averages across ${years} with data for both groups.` : `Across ${years} with data for both groups, ${firstLabel} averages ${direction} than ${secondLabel} by ${format(Math.abs(difference))}.`
  const lastCommon = points.findLast((point) => point.first !== null && point.second !== null)
  const latest = lastCommon ? `${t.year} ${lastCommon.year}: ${firstLabel} ${format(lastCommon.first!)}; ${secondLabel} ${format(lastCommon.second!)}.` : t.noData
  const firstValid = points.find((point) => point.first !== null)
  const lastValid = points.findLast((point) => point.first !== null)
  let trend = t.singleYear
  if (firstValid && lastValid && firstValid.year !== lastValid.year) {
    const delta = lastValid.first! - firstValid.first!
    const direction = delta > 0 ? t.rose : delta < 0 ? t.fell : t.unchanged
    trend = language === 'vi'
      ? `${firstLabel} ${direction} từ ${format(firstValid.first!)} (${firstValid.year}) đến ${format(lastValid.first!)} (${lastValid.year}).`
      : `${firstLabel} ${direction} from ${format(firstValid.first!)} (${firstValid.year}) to ${format(lastValid.first!)} (${lastValid.year}).`
  }
  let conclusion: string
  if (language === 'vi') {
    if (difference === 0) {
      conclusion = `Nhìn chung, hai nhóm có mức ${metric === 'income' ? 'thu nhập' : metric === 'labor' ? 'sử dụng lao động' : 'phát thải metan'} bình quân tương đương trong giai đoạn được chọn.`
    } else if (metric === 'income') {
      conclusion = difference > 0
        ? 'Trong mô phỏng, 1Mha có thu nhập bình quân cao hơn; cần xem thêm chi phí, tài nguyên và phát thải khi cân nhắc áp dụng.'
        : 'Nhìn chung, thu nhập bình quân của 1Mha chưa vượt thường lệ trong giai đoạn được chọn, nên dữ liệu này chưa cho thấy lợi thế về thu nhập của 1Mha.'
    } else if (metric === 'labor') {
      conclusion = difference > 0
        ? 'Trong mô phỏng, 1Mha có nhu cầu lao động bình quân cao hơn; đây là một yếu tố cần cân nhắc cùng thu nhập và chi phí.'
        : 'Trong mô phỏng, 1Mha có nhu cầu lao động bình quân thấp hơn; cần xem xét kết quả này cùng thu nhập và chi phí.'
    } else {
      conclusion = difference < 0
        ? 'Nhóm có AWD có phát thải metan bình quân thấp hơn trong dữ liệu mô phỏng; so sánh này không tự chứng minh quan hệ nhân quả.'
        : 'Nhìn chung, nhóm có AWD có mức phát thải metan bình quân cao hơn nhóm không có AWD, nên dữ liệu giai đoạn này chưa cho thấy lợi thế về giảm phát thải của nhóm có AWD.'
    }
  } else {
    if (difference === 0) {
      conclusion = `Overall, the two groups have equal average ${metric === 'income' ? 'income' : metric === 'labor' ? 'labor requirements' : 'methane emissions'} over the selected period.`
    } else if (metric === 'income') {
      conclusion = difference > 0
        ? 'In the simulation, 1Mha has higher average income; costs, resources and emissions also need consideration before application.'
        : 'Overall, average income under 1Mha remains below business as usual over the selected period, so these data do not show an income advantage for 1Mha.'
    } else if (metric === 'labor') {
      conclusion = difference > 0
        ? 'In the simulation, 1Mha has higher average labor requirements; consider this alongside income and costs.'
        : 'In the simulation, 1Mha has lower average labor requirements; consider this alongside income and costs.'
    } else {
      conclusion = difference < 0
        ? 'The with-AWD group has lower average methane emissions in the simulation data; this comparison alone does not establish causation.'
        : 'Overall, the with-AWD group has higher average methane emissions than the without-AWD group, so these data do not show an emissions advantage for the with-AWD group over this period.'
    }
  }
  const validFirst = points.filter((point) => point.first !== null && Number.isFinite(point.first))
  const validSecond = points.filter((point) => point.second !== null && Number.isFinite(point.second))
  const endpoints = (series: typeof validFirst) => [series[0], series.at(-1)] as const
  const [firstStart, firstEnd] = endpoints(validFirst)
  const [secondStart, secondEnd] = endpoints(validSecond)
  const seriesTrend = (label: string, start: ChartPoint | undefined, end: ChartPoint | undefined, key: 'first' | 'second') => {
    if (!start || !end || start.year === end.year) return ''
    const startValue = start[key]!, endValue = end[key]!
    const change = startValue === 0 ? null : (endValue - startValue) / Math.abs(startValue) * 100
    const changeText = change === null ? `${format(endValue - startValue)}` : `${new Intl.NumberFormat(language, { maximumFractionDigits: 1 }).format(Math.abs(change))} %`
    const direction = endValue > startValue ? (language === 'vi' ? 'tăng' : 'increased') : endValue < startValue ? (language === 'vi' ? 'giảm' : 'decreased') : (language === 'vi' ? 'gần như không đổi' : 'remained nearly unchanged')
    const connector = endValue >= startValue ? (language === 'vi' ? 'lên' : 'to') : (language === 'vi' ? 'xuống' : 'to')
    return language === 'vi'
      ? `${label} ${direction} ${changeText}, từ ${format(startValue)} (${start.year}) ${connector} ${format(endValue)} (${end.year})`
      : `${label} ${direction} ${changeText}, from ${format(startValue)} (${start.year}) to ${format(endValue)} (${end.year})`
  }
  const firstTrend = seriesTrend(firstLabel, firstStart, firstEnd, 'first')
  const secondTrend = seriesTrend(secondLabel, secondStart, secondEnd, 'second')
  const differenceAmount = relativeDifference === null
    ? format(Math.abs(difference))
    : `${new Intl.NumberFormat(language, { maximumFractionDigits: 1 }).format(Math.abs(relativeDifference))} %`
  const paragraph = language === 'vi'
    ? `Trong giai đoạn ${validFirst[0]?.year ?? ''}–${validFirst.at(-1)?.year ?? ''}, ${firstLabel} đạt bình quân ${format(firstMean)}, ${direction} ${differenceAmount} so với ${secondLabel} (${format(secondMean)}). ${[firstTrend, secondTrend].filter(Boolean).join('; ')}.`
    : `From ${validFirst[0]?.year ?? ''} to ${validFirst.at(-1)?.year ?? ''}, ${firstLabel} averaged ${format(firstMean)}, ${direction} ${differenceAmount} compared with ${secondLabel} (${format(secondMean)}). ${[firstTrend, secondTrend].filter(Boolean).join('; ')}.`
  return { firstLabel, secondLabel, firstMean, secondMean, difference, statistic, comparison, latest, trend, conclusion, paragraph }
}
