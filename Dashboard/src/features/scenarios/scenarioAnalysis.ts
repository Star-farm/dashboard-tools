import type { Language } from '../../i18n'
import type { ScenarioSnapshot } from './scenarioTypes'

export function relativeChange(value: number | null, baseline: number | null): number | null {
  if (value === null || baseline === null || baseline === 0) return null
  const change = (value - baseline) / Math.abs(baseline) * 100
  return Number.isFinite(change) ? change : null
}

export function scenarioSummary(values: ScenarioSnapshot['values'], baseline: ScenarioSnapshot['values'], language: Language) {
  const changes = Object.fromEntries(Object.entries(values).map(([key, value]) => [key, relativeChange(value, baseline[key as keyof typeof baseline])]))
  const percent = new Intl.NumberFormat(language, { minimumFractionDigits: 1, maximumFractionDigits: 1 })
  function describe(change: number | null) {
    if (change === null) return language === 'vi' ? 'chưa đủ dữ liệu để so sánh' : 'cannot be compared with the available data'
    if (Math.abs(change) < 0.000001) return language === 'vi' ? 'không thay đổi' : 'remained unchanged'
    return language === 'vi'
      ? `${change > 0 ? 'tăng' : 'giảm'} ${percent.format(Math.abs(change))}%`
      : `${change > 0 ? 'increased' : 'decreased'} by ${percent.format(Math.abs(change))}%`
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
  return language === 'vi'
    ? `Trong giai đoạn 2027–2050, thu nhập ròng ${describe(changes.income)} và năng suất trung bình ${describe(changes.yield)} so với nền 2016–2022. Chi phí sản xuất ${describe(changes.cost)}, tỷ suất lợi nhuận ${describe(changes.margin)} và ROI ${describe(changes.roi)}. Giá trị rơm ${describe(changes.straw)}, lượng nước sử dụng ${describe(changes.water)} và phát thải metan ${describe(changes.methane)}. ${conclusion}`
    : `For 2027–2050, net income ${describe(changes.income)} and average yield ${describe(changes.yield)} relative to the 2016–2022 baseline. Production cost ${describe(changes.cost)}, profit margin ${describe(changes.margin)} and ROI ${describe(changes.roi)}. Straw value ${describe(changes.straw)}, water usage ${describe(changes.water)} and methane emissions ${describe(changes.methane)}. ${conclusion}`
}
