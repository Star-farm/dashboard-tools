import type { Language } from '../../i18n'
import { bau3Conditions } from './bau3Types'
import type { Bau3Condition, Bau3Currency, Bau3Data, Bau3Family, Bau3Metric } from './bau3Types'
import { bau3Text } from './bau3Text'

export function selectBau3Points(data: Bau3Data, family: Bau3Family, metric: Bau3Metric, currency: Bau3Currency) {
  const series = new Map(bau3Conditions.map((condition) => [condition, new Map((data.series.find((item) => item.family === family && item.condition === condition)?.[currency] ?? []).map((point) => [point.year, point[metric]]))]))
  return Array.from({ length: data.endYear - data.startYear + 1 }, (_, index) => {
    const year = data.startYear + index
    return { year, ...Object.fromEntries(bau3Conditions.map((condition) => [condition, series.get(condition)?.get(year) ?? null])) } as { year: number } & Record<Bau3Condition, number | null>
  })
}

export function bau3Unit(metric: Bau3Metric, language: Language) {
  const t = bau3Text[language]
  return metric === 'income' || metric === 'cost' ? t.moneyUnit : metric === 'margin' ? '%' : metric === 'yield' ? t.yieldUnit : t.laborUnit
}

export function formatBau3Value(value: number, metric: Bau3Metric, language: Language) {
  const digits = language === 'vi' && (metric === 'income' || metric === 'cost') ? 0 : 2
  return new Intl.NumberFormat(language, { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(value)
}

export function bau3Domain(data: Bau3Data, metric: Bau3Metric, currency: Bau3Currency): [number, number] {
  const values = data.series.flatMap((series) => series[currency].map((point) => point[metric])).filter((value): value is number => value !== null && Number.isFinite(value))
  if (!values.length) return [0, 1]
  const includeZero = ['income', 'cost', 'margin'].includes(metric)
  const min = includeZero ? Math.min(0, ...values) : Math.min(...values)
  const max = includeZero ? Math.max(0, ...values) : Math.max(...values)
  const span = max - min || Math.max(1, Math.abs(max) * .1)
  const step = 10 ** Math.floor(Math.log10(span)) / 2
  const padding = span * .08
  const low = min === 0 && includeZero ? 0 : Math.floor((min - padding) / step) * step
  const high = Math.ceil((max + padding) / step) * step
  return [low, high > low ? high : low + step]
}

export function analyzeBau3(data: Bau3Data, metric: Bau3Metric, language: Language) {
  const t = bau3Text[language]
  const variant = data.variant ?? 'bau3s'
  const baseline = { bau3s: t.bau3Short, bau2s: t.bau2Short, bauss: t.baussShort }[variant]
  const currency: Bau3Currency = language === 'vi' ? 'VND' : 'USD'
  const stats = bau3Conditions.flatMap((condition) => {
    const bau = data.series.find((series) => series.family === variant && series.condition === condition)?.[currency] ?? []
    const one = new Map((data.series.find((series) => series.family === 'oneMha' && series.condition === condition)?.[currency] ?? []).map((point) => [point.year, point[metric]]))
    const pairs = bau.flatMap((point) => {
      const other = one.get(point.year)
      return point[metric] !== null && other !== undefined && other !== null ? [{ year: point.year, bau: point[metric], one: other }] : []
    }).sort((a, b) => a.year - b.year)
    if (!pairs.length) return []
    const bauMean = pairs.reduce((sum, pair) => sum + pair.bau, 0) / pairs.length
    const oneMean = pairs.reduce((sum, pair) => sum + pair.one, 0) / pairs.length
    return [{ condition, bauMean, oneMean, difference: oneMean - bauMean, relative: bauMean === 0 ? null : (oneMean - bauMean) / Math.abs(bauMean) * 100, last: pairs.at(-1)! }]
  })
  if (!stats.length) return null
  const higher = stats.filter(({ difference }) => difference > .000001).length
  const lower = stats.filter(({ difference }) => difference < -.000001).length
  const equal = stats.length - higher - lower
  const count = stats.length
  const number = new Intl.NumberFormat(language, { maximumFractionDigits: 1 })
  const period = `${data.startYear}–${data.endYear}`
  const direction = language === 'vi'
    ? higher === count ? `cao hơn ở cả ${count} tổ hợp` : lower === count ? `thấp hơn ở cả ${count} tổ hợp` : [higher ? `cao hơn ở ${higher}/${count} tổ hợp` : '', lower ? `thấp hơn ở ${lower}/${count} tổ hợp` : '', equal ? `tương đương ở ${equal}/${count} tổ hợp` : ''].filter(Boolean).join(', ')
    : higher === count ? `higher in all ${count} combinations` : lower === count ? `lower in all ${count} combinations` : [higher ? `higher in ${higher}/${count} combinations` : '', lower ? `lower in ${lower}/${count} combinations` : '', equal ? `similar in ${equal}/${count} combinations` : ''].filter(Boolean).join(', ')
  const relative = metric !== 'margin' && stats.every((stat) => stat.relative !== null)
  const differences = stats.map((stat) => relative ? stat.relative! : stat.difference)
  const minimum = number.format(Math.min(...differences)), maximum = number.format(Math.max(...differences))
  const range = minimum === maximum ? minimum : `${minimum}–${maximum}`
  const changeUnit = relative ? '%' : metric === 'margin' ? language === 'vi' ? 'điểm phần trăm' : 'percentage points' : bau3Unit(metric, language)
  const metricName = metric === 'yield' ? language === 'vi' ? 'năng suất' : 'yield' : t[metric].toLocaleLowerCase(language)
  const change = `${range}${relative ? '%' : ` ${changeUnit}`}`
  const comparison = language === 'vi'
    ? `Trong ${period}, ${metricName} bình quân của 1Mha ${direction} thời tiết–tài nguyên so với ${baseline}; mức chênh lệch ${change}.`
    : `Over ${period}, average ${metricName} under 1Mha is ${direction} of weather and resources compared with ${baseline}, with a difference of ${change}.`
  const focus = stats.find((stat) => stat.condition === 'severeShortage') ?? stats[0]
  const unit = bau3Unit(metric, language)
  const last = language === 'vi'
    ? `Ở tổ hợp “${t[focus.condition]}”, năm ${focus.last.year}, ${baseline} đạt ${formatBau3Value(focus.last.bau, metric, language)} ${unit}, còn 1Mha đạt ${formatBau3Value(focus.last.one, metric, language)} ${unit}.`
    : `For “${t[focus.condition]}” in ${focus.last.year}, ${baseline} reaches ${formatBau3Value(focus.last.bau, metric, language)} ${unit}, versus ${formatBau3Value(focus.last.one, metric, language)} ${unit} for 1Mha.`
  let conclusion: string
  if (metric === 'income' || metric === 'margin') {
    conclusion = language === 'vi'
      ? higher === count ? 'Vì vậy, nên ưu tiên 1Mha để cải thiện hiệu quả kinh tế, đồng thời bảo đảm nguồn vốn và kiểm soát chi phí khi triển khai.' : 'Việc triển khai 1Mha cần chọn điều kiện có lợi thế về khả năng sinh lời và kiểm soát chi phí theo từng tổ hợp.'
      : higher === count ? 'This supports prioritizing 1Mha to improve economic performance, with sufficient financing and cost control during implementation.' : 'Implementation of 1Mha should target conditions with a profitability advantage and manage costs for each combination.'
  } else if (metric === 'cost') {
    conclusion = language === 'vi'
      ? higher === count ? 'Do đó, triển khai 1Mha cần dự trù vốn cao hơn, tối ưu vật tư và bảo đảm khả năng tiếp cận tài nguyên, nhất là khi khan hiếm.' : 'Cần lựa chọn tổ hợp có chi phí phù hợp và lập kế hoạch vốn, vật tư trước khi triển khai 1Mha.'
      : higher === count ? 'Implementing 1Mha therefore requires a larger budget, efficient input use and reliable resource access, particularly under shortages.' : 'Implementation of 1Mha should select affordable combinations and plan financing and inputs in advance.'
  } else if (metric === 'yield') {
    const resilient = focus.condition.startsWith('severe') && focus.last.one > focus.last.bau
    conclusion = language === 'vi'
      ? resilient ? `1Mha cho thấy khả năng duy trì năng suất tốt hơn ở điều kiện khắc nghiệt cuối kỳ; cần tiếp tục cải thiện năng suất ở những tổ hợp còn thấp hơn ${baseline}.` : `Cần cải thiện kỹ thuật và lựa chọn giống phù hợp khi triển khai 1Mha tại các tổ hợp năng suất còn thấp hơn ${baseline}.`
      : resilient ? `1Mha maintains a higher yield under the adverse end-period conditions; further yield improvements are needed in combinations where it trails ${baseline}.` : `Implementing 1Mha requires improved practices and suitable varieties in combinations where its yield trails ${baseline}.`
  } else {
    conclusion = language === 'vi'
      ? higher === count ? `1Mha cần nhiều giờ lao động hơn ${baseline} ở tất cả tổ hợp; cần dự trù nhân công, đào tạo và cơ giới hóa phù hợp khi triển khai.` : lower === count ? `1Mha cần ít giờ lao động hơn ${baseline} ở tất cả tổ hợp; nên tận dụng lợi thế này cùng đào tạo và cơ giới hóa phù hợp.` : 'Kế hoạch triển khai 1Mha cần bố trí nhân công và cơ giới hóa theo từng điều kiện, vì mức tiết kiệm lao động khác nhau giữa các tổ hợp.'
      : higher === count ? `1Mha requires more labor hours than ${baseline} in every combination; implementation needs suitable staffing, training and mechanization.` : lower === count ? `1Mha requires fewer labor hours than ${baseline} in every combination; this advantage should be supported by appropriate training and mechanization.` : 'Plans for implementing 1Mha should adapt staffing and mechanization to each condition, as labor savings vary across combinations.'
  }
  return { higher, lower, equal, count, comparison, last, conclusion, paragraph: `${comparison} ${last} ${conclusion}` }
}
