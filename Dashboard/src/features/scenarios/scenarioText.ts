import type { Language } from '../../i18n'
import type { ScenarioMetric } from './scenarioTypes'

const vi = {
  title: 'Về các chỉ số kịch bản đến năm 2050',
  period: 'Bình quân giai đoạn',
  select: 'Chọn kịch bản',
  summary: 'Nhận xét tổng quan',
  economics: 'Kinh tế',
  resources: 'Tài nguyên',
  sustainability: 'Môi trường',
  comparedWith: 'So với giai đoạn',
  changeUnavailable: 'Chưa tính được tỷ lệ thay đổi',
  awd: 'Áp dụng AWD',
  withAwd: 'Sử dụng AWD',
  withoutAwd: 'Không sử dụng AWD',
  mixedAwd: 'Có áp dụng AWD',
  roiNote: 'ROI là trung bình của thu nhập ròng / chi phí sản xuất × 100 % trên từng bản ghi có chi phí lớn hơn 0.',
  groupthreeSeasons: 'Canh tác như thường lệ · 3 mùa vụ',
  grouptwoSeasons: 'Canh tác như thường lệ · 2 mùa vụ',
  groupsustainable: 'Canh tác như thường lệ · Bền vững',
  grouponeMha: 'Một triệu hecta (1Mha)',
  laborUnit: 'giờ/ha',
  yieldUnit: 'tấn/ha',
  waterUnit: 'mm',
  fertilizerUnit: 'kg nito/ha',
  pesticidesUnit: 'lần',
  methaneUnit: 'kg metan/ha',
  intensityUnit: 'kg metan/tấn gạo',
}

const en: Record<keyof typeof vi, string> = {
  title: 'Scenario indicators through 2050',
  period: 'Period average',
  select: 'Choose a scenario',
  summary: 'Scenario overview',
  economics: 'Economics',
  resources: 'Resources',
  sustainability: 'Environment',
  comparedWith: 'Compared with the period',
  changeUnavailable: 'Relative change unavailable',
  awd: 'AWD adoption',
  withAwd: 'With AWD',
  withoutAwd: 'Without AWD',
  mixedAwd: 'AWD adopted',
  roiNote: 'ROI is the average of net income / production cost × 100 % for individual records with positive production costs.',
  groupthreeSeasons: 'Business as usual · 3 seasons',
  grouptwoSeasons: 'Business as usual · 2 seasons',
  groupsustainable: 'Business as usual · Sustainable',
  grouponeMha: 'One million hectares (1Mha)',
  laborUnit: 'hours/ha',
  yieldUnit: 'ton/ha',
  waterUnit: 'mm',
  fertilizerUnit: 'kg nitrogen/ha',
  pesticidesUnit: 'applications',
  methaneUnit: 'kg methane/ha',
  intensityUnit: 'kg methane/ton rice',
}

export const scenarioText = { vi, en }
export const scenarioMetricLabels: Record<Language, Record<ScenarioMetric, string>> = {
  vi: { income: 'Thu nhập ròng trên hecta', straw: 'Giá trị rơm trên hecta', cost: 'Chi phí sản xuất', labor: 'Thời gian lao động', yield: 'Năng suất trung bình', margin: 'Tỷ suất lợi nhuận', roi: 'Tỷ suất hoàn vốn (ROI)', water: 'Sử dụng nước', fertilizer: 'Sử dụng phân bón gốc nito', pesticides: 'Sử dụng thuốc trừ sâu', methane: 'Phát thải khí metan', intensity: 'Cường độ phát thải' },
  en: { income: 'Net income per hectare', straw: 'Straw value per hectare', cost: 'Production cost', labor: 'Labor requirements', yield: 'Average yield', margin: 'Profit margin', roi: 'Return on investment (ROI)', water: 'Water usage', fertilizer: 'Nitrogen-based fertilizer usage', pesticides: 'Pesticide usage', methane: 'Methane emissions', intensity: 'Emission intensity' },
}
