import type { Language } from '../../i18n'
import { scenarioMetrics } from './scenarioTypes'
import type { ScenarioMetric, ScenarioSnapshot } from './scenarioTypes'

export interface ScenarioSummaryPart { text: string; tone?: 'good' | 'bad' | 'neutral'; metric?: ScenarioMetric }

export function scenarioChangeTone(metric: ScenarioMetric, change: number | null) {
  if (change === null || Math.abs(change) < .000001) return 'neutral'
  return (change > 0) === (scenarioMetrics.find((item) => item.id === metric)!.preferred === 'higher') ? 'good' : 'bad'
}

export function relativeChange(value: number | null, baseline: number | null): number | null {
  if (value === null || baseline === null || baseline === 0) return null
  const change = (value - baseline) / Math.abs(baseline) * 100
  return Number.isFinite(change) ? change : null
}

export function scenarioSummaryParts(values: ScenarioSnapshot['values'], baseline: ScenarioSnapshot['values'], language: Language): ScenarioSummaryPart[] {
  const changes = Object.fromEntries(Object.entries(values).map(([key, value]) => [key, relativeChange(value, baseline[key as keyof typeof baseline])])) as Record<ScenarioMetric, number | null>
  const percent = new Intl.NumberFormat(language, { minimumFractionDigits: 1, maximumFractionDigits: 1 })
  function describe(metric: ScenarioMetric): ScenarioSummaryPart[] {
    const change = changes[metric]
    if (change === null) return [{ text: language === 'vi' ? 'chưa đủ dữ liệu để so sánh' : 'cannot be compared with the available data' }]
    if (Math.abs(change) < 0.000001) return [{ text: language === 'vi' ? 'không thay đổi' : 'remained unchanged' }]
    return [
      { text: language === 'vi' ? `${change > 0 ? 'tăng' : 'giảm'} ` : `${change > 0 ? 'increased' : 'decreased'} by ` },
      { text: `${percent.format(Math.abs(change))}%`, tone: scenarioChangeTone(metric, change), metric },
    ]
  }
  let conclusion: string
  if (changes.income === null || changes.methane === null) {
    conclusion = language === 'vi' ? 'Cần có đủ dữ liệu về thu nhập và phát thải để đánh giá đầy đủ các đánh đổi của kịch bản.' : 'Complete income and emissions data are needed to assess the scenario’s trade-offs.'
  } else if (changes.income > 0 && changes.methane < 0) {
    conclusion = language === 'vi' ? 'Nhìn chung, kịch bản thể hiện lợi thế về thu nhập và giảm phát thải, là một lựa chọn đáng xem xét trong các điều kiện mô hình.' : 'Overall, this scenario offers higher income alongside lower emissions, making it an option worth considering under the modeled conditions.'
  } else if (changes.income < 0 && changes.methane < 0) {
    conclusion = language === 'vi' ? 'Nhìn chung, lợi ích giảm phát thải đi kèm đánh đổi về thu nhập; cần cân nhắc chi phí và nguồn lực khi lựa chọn kịch bản.' : 'Overall, lower emissions come with an income trade-off; costs and resource requirements should be considered when choosing this scenario.'
  } else if (changes.income > 0 && changes.methane > 0) {
    conclusion = language === 'vi' ? 'Nhìn chung, lợi thế thu nhập đi kèm mức phát thải cao hơn; cần xem xét thêm các biện pháp quản lý phát thải.' : 'Overall, the income advantage comes with higher emissions, indicating a need to consider additional emissions management measures.'
  } else if (changes.income < 0 && changes.methane > 0) {
    conclusion = language === 'vi' ? 'Nhìn chung, thu nhập thấp hơn và phát thải cao hơn là hai hạn chế cần cân nhắc trước khi lựa chọn kịch bản.' : 'Overall, lower income and higher emissions are two limitations to consider before choosing this scenario.'
  } else {
    conclusion = language === 'vi' ? 'Nhìn chung, cần xem đồng thời các chỉ số kinh tế, nguồn lực và phát thải để lựa chọn kịch bản phù hợp.' : 'Overall, economic, resource and emissions indicators should be considered together when selecting a suitable scenario.'
  }
  const parts = language === 'vi'
    ? ['Trong giai đoạn 2027–2050, thu nhập ròng ', describe('income'), ' và năng suất trung bình ', describe('yield'), ' so với giai đoạn 2016–2022. Chi phí sản xuất ', describe('cost'), ', tỷ suất lợi nhuận ', describe('margin'), ' và ROI ', describe('roi'), '. Giá trị rơm ', describe('straw'), ', lượng nước sử dụng ', describe('water'), ' và phát thải Metan ', describe('methane'), `. ${conclusion}`]
    : ['For 2027–2050, net income ', describe('income'), ' and average yield ', describe('yield'), ' relative to the 2016–2022 baseline. Production cost ', describe('cost'), ', profit margin ', describe('margin'), ', and ROI ', describe('roi'), '. Straw value ', describe('straw'), ', water usage ', describe('water'), ', and methane emissions ', describe('methane'), `. ${conclusion}`]
  return parts.flatMap((part) => typeof part === 'string' ? [{ text: part }] : part)
}

export function scenarioSummary(values: ScenarioSnapshot['values'], baseline: ScenarioSnapshot['values'], language: Language) {
  return scenarioSummaryParts(values, baseline, language).map((part) => part.text).join('')
}
