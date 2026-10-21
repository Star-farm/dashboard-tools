import type { Language } from '../../i18n'
import type { AnnualSeries, ChartPoint, Currency, Metric } from './futureTypes'
import { futureText } from './futureText'

export const SERIES_COLORS = { first: '#2f8050', second: '#bf554c' } as const

export function selectChartPoints(annual: AnnualSeries[], metric: Metric, currency: Currency, start: number, end: number): ChartPoint[] {
  return annual.filter((row) => row.year >= start && row.year <= end).map((row) => ({
    year: row.year,
    ...(metric === 'income' ? currency === 'USD' ? row.incomeUsd : row.incomeVnd : row[metric]),
  }))
}

export function metricUnit(metric: Metric, currency: Currency, language: Language) {
  if (metric === 'income') return currency === 'USD' ? '$/ha' : 'VNĐ/ha'
  return metric === 'labor' ? futureText[language].laborUnit : 'kg CH₄/ha'
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
  const firstMean = mean(points.map((point) => point.first))
  const secondMean = mean(points.map((point) => point.second))
  if (firstMean === null || secondMean === null) return null
  const difference = firstMean - secondMean
  const unit = metricUnit(metric, currency, language)
  const format = (value: number) => `${formatValue(value, metric, currency, language)} ${unit}`
  const percent = new Intl.NumberFormat(language, { maximumFractionDigits: 1, signDisplay: 'always' })
  const relativeDifference = secondMean > 0 ? difference / secondMean * 100 : null
  const statistic = relativeDifference !== null ? `${percent.format(relativeDifference)}%` : `${difference > 0 ? '+' : ''}${format(difference)}`
  const direction = difference > 0 ? t.higher : difference < 0 ? t.lower : t.equal
  const comparison = language === 'vi'
    ? `Trung bình giai đoạn, ${firstLabel} ${direction} ${secondLabel}${difference ? ` ${format(Math.abs(difference))}` : ''}.`
    : difference === 0 ? `${firstLabel} and ${secondLabel} have equal period averages.` : `Over the period, ${firstLabel} averages ${direction} than ${secondLabel} by ${format(Math.abs(difference))}.`
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
      const declining = firstValid && lastValid && lastValid.first! < firstValid.first!
      conclusion = difference > 0
        ? `Vì vậy, kết quả mô hình ủng hộ việc ưu tiên áp dụng 1Mha để nâng thu nhập so với canh tác thường lệ${declining ? ', đồng thời theo dõi xu hướng giảm thu nhập để điều chỉnh kế hoạch sản xuất phù hợp' : ' trong các điều kiện đang xét'}.`
        : 'Nhìn chung, thu nhập bình quân của 1Mha chưa vượt thường lệ trong giai đoạn được chọn, nên dữ liệu này chưa cho thấy lợi thế về thu nhập của 1Mha.'
    } else if (metric === 'labor') {
      conclusion = difference > 0
        ? 'Vì vậy, đề xuất triển khai 1Mha đi kèm kế hoạch bố trí nhân công và xem xét cơ giới hóa phù hợp để đáp ứng nhu cầu lao động tăng thêm so với thường lệ.'
        : 'Kết quả này ủng hộ việc ưu tiên áp dụng 1Mha để giảm nhu cầu lao động so với thường lệ, kết hợp bố trí nhân công phù hợp với từng mùa vụ.'
    } else {
      conclusion = difference < 0
        ? 'Mức phát thải metan bình quân thấp hơn của nhóm có AWD là cơ sở để đề xuất ưu tiên AWD trong các phương án canh tác hướng tới giảm phát thải, kết hợp theo dõi hiệu quả tại điều kiện canh tác thực tế.'
        : 'Nhìn chung, nhóm có AWD có mức phát thải metan bình quân cao hơn nhóm không có AWD, nên dữ liệu giai đoạn này chưa cho thấy lợi thế về giảm phát thải của nhóm có AWD.'
    }
  } else {
    if (difference === 0) {
      conclusion = `Overall, the two groups have equal average ${metric === 'income' ? 'income' : metric === 'labor' ? 'labor requirements' : 'methane emissions'} over the selected period.`
    } else if (metric === 'income') {
      const declining = firstValid && lastValid && lastValid.first! < firstValid.first!
      conclusion = difference > 0
        ? `These model results support prioritizing 1Mha to improve income relative to business as usual${declining ? ', while monitoring the decline in income and adjusting production plans accordingly' : ' under the conditions considered'}.`
        : 'Overall, average income under 1Mha remains below business as usual over the selected period, so these data do not show an income advantage for 1Mha.'
    } else if (metric === 'labor') {
      conclusion = difference > 0
        ? 'We therefore recommend implementing 1Mha alongside workforce planning and consideration of suitable mechanization to accommodate the additional labor required compared with business as usual.'
        : 'These results support prioritizing 1Mha to reduce labor requirements relative to business as usual, with workforce planning tailored to each season.'
    } else {
      conclusion = difference < 0
        ? 'The lower average methane emissions in the with-AWD group support prioritizing AWD in farming plans aimed at reducing emissions, alongside monitoring performance under actual farming conditions.'
        : 'Overall, the with-AWD group has higher average methane emissions than the without-AWD group, so these data do not show an emissions advantage for the with-AWD group over this period.'
    }
  }
  const paragraph = [comparison, trend, latest, conclusion].join(' ')
  return { firstLabel, secondLabel, firstMean, secondMean, difference, statistic, comparison, latest, trend, conclusion, paragraph }
}
