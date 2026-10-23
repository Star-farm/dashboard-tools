import type { Language } from '../../i18n'
import type { ComparisonCohort, ComparisonMetric } from './comparisonData'
import { economicsText } from './economicsText'
import { comparisonText } from './comparisonText'

export function comparisonSummary(cohort: ComparisonCohort, language: Language, startYear: number, endYear: number) {
  const t = economicsText[language]
  const currency = language === 'vi' ? 'VND' : 'USD'
  const bau = cohort.groups.bau[currency], one = cohort.groups.oneMha[currency]
  const percent = new Intl.NumberFormat(language, { maximumFractionDigits: 1 })
  const number = (value: number, money = false) => new Intl.NumberFormat(language, { minimumFractionDigits: money && language === 'vi' ? 0 : 2, maximumFractionDigits: money && language === 'vi' ? 0 : 2 }).format(value)
  const difference = (metric: ComparisonMetric) => one[metric] === null || bau[metric] === null ? null : one[metric] - bau[metric]
  const describe = (metric: ComparisonMetric) => {
    const delta = difference(metric)
    const name = metric === 'yield' ? language === 'vi' ? 'năng suất' : 'yield' : t[metric].toLocaleLowerCase(language)
    if (delta === null) return language === 'vi' ? `chưa đủ dữ liệu so sánh ${name}` : `insufficient data to compare ${name}`
    if (Math.abs(delta) < .000001) return language === 'vi' ? `${name} tương đương` : `${name} is similar`
    const direction = language === 'vi' ? delta > 0 ? 'cao hơn' : 'thấp hơn' : delta > 0 ? 'higher' : 'lower'
    const unit = metric === 'yield' ? t.yieldUnit : metric === 'labor' ? t.laborUnit : t.moneyUnit
    const amount = bau[metric] === 0 ? `${number(Math.abs(delta), ['income', 'cost', 'straw'].includes(metric))} ${unit}` : `${percent.format(Math.abs(delta) / Math.abs(bau[metric]!) * 100)}%`
    return language === 'vi' ? `${name} ${direction} ${amount}` : `${name} is ${amount} ${direction}`
  }
  if (Object.values(one).every((value) => value === null) || Object.values(bau).every((value) => value === null)) return comparisonText[language].noData
  const period = `${startYear} - ${endYear}`
  const introduction = language === 'vi'
    ? `Trong giai đoạn ${period}, với lựa chọn thời tiết và tài nguyên hiện tại, `
    : `For ${period}, under the selected weather and resource conditions, `
  const income = one.income === null || bau.income === null
    ? language === 'vi' ? 'chưa đủ dữ liệu đối chiếu thu nhập ròng của hai nhóm.' : 'there is insufficient data to compare net income between the groups.'
    : language === 'vi'
      ? `thu nhập ròng bình quân của 1Mha là ${number(one.income, true)} ${t.moneyUnit}, so với ${number(bau.income, true)} ${t.moneyUnit} của thường lệ (${describe('income')}).`
      : `average net income under 1Mha is ${number(one.income, true)} ${t.moneyUnit}, compared with ${number(bau.income, true)} ${t.moneyUnit} under business as usual (${describe('income')}).`
  const details = (['cost', 'straw', 'yield', 'labor'] as const).map(describe)
  const comparisons = language === 'vi'
    ? `Các chỉ số còn lại của 1Mha so với thường lệ: ${details.slice(0, -1).join(', ')} và ${details.at(-1)}.`
    : `Compared with business as usual, ${details.slice(0, -1).join(', ')}, and ${details.at(-1)} under 1Mha.`
  const needs: string[] = []
  if ((difference('cost') ?? 0) > .000001) needs.push(language === 'vi' ? 'chuẩn bị vốn sản xuất' : 'plan production financing')
  if ((difference('labor') ?? 0) > .000001) needs.push(language === 'vi' ? 'bố trí nhân công' : 'provide sufficient labor')
  if ((difference('yield') ?? 0) < -.000001) needs.push(language === 'vi' ? 'cải thiện năng suất' : 'improve yields')
  const actions = needs.length > 1 ? `${needs.slice(0, -1).join(', ')} ${language === 'vi' ? 'và' : 'and'} ${needs.at(-1)}` : needs[0]
  const incomeDelta = difference('income')
  const conclusion = incomeDelta === null
    ? language === 'vi' ? 'Cần bổ sung dữ liệu thu nhập trước khi kết luận về lợi thế kinh tế của 1Mha.' : 'Net income data is needed before drawing a conclusion about the economic advantage of 1Mha.'
    : incomeDelta > .000001
      ? language === 'vi'
        ? `Nhìn chung, nên ưu tiên 1Mha để cải thiện thu nhập${actions ? `, đồng thời ${actions}` : ''}.`
        : `Overall, the income advantage supports prioritizing 1Mha${actions ? `; implementation should ${actions}` : ''}.`
      : language === 'vi'
        ? 'Với lựa chọn này, 1Mha chưa có lợi thế về thu nhập ròng; cần xem xét chi phí, nguồn lao động và khả năng cải thiện năng suất trước khi triển khai.'
        : 'Under this selection, 1Mha has no net income advantage; production costs, labor availability and opportunities to improve yields need consideration before implementation.'
  return `${introduction}${income} ${comparisons} ${conclusion}`
}
