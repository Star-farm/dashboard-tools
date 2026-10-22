import type { EconomicFilters, EconomicMetric } from './economicsData'

const vi = {
  title: 'Tổng quan kinh tế', filters: 'Lọc kịch bản', all: 'Tất cả', reset: 'Xóa bộ lọc', results: 'Kết quả theo kịch bản', scenario: 'kịch bản',
  historical: 'Hiện trạng', noResults: 'Không có kịch bản phù hợp', noResultsDescription: 'Thử thay đổi lựa chọn hoặc xóa bộ lọc để xem tất cả kịch bản.',
  scenarioColumns: 'Thông tin kịch bản', financialColumns: 'Hiệu quả tài chính', productionColumns: 'Sản xuất',
  tableCaption: 'Các chỉ số kinh tế trung bình theo kịch bản', mobileResults: 'Các kịch bản kinh tế', sort: 'Sắp xếp theo', unit: 'Đơn vị',
  roiNote: 'Thu nhập ròng bình quân / Chi phí sản xuất bình quân × 100%.',
  moneyUnit: 'VNĐ/ha', yieldUnit: 'tấn/ha', laborUnit: 'giờ/ha',
  group: 'Nhóm kịch bản', season: 'Mùa vụ', climate: 'Thời tiết', resource: 'Tài nguyên', awd: 'Áp dụng AWD',
  bau: 'Thường lệ', oneMha: '1Mha', sustainable: 'Bền vững', threeSeasons: '3 mùa vụ', twoSeasons: '2 mùa vụ', mild: 'Bình thường', severe: 'Khắc nghiệt', normal: 'Kinh tế bình thường', neutral: 'Trung tính', shortage: 'Thiếu tài nguyên', with: 'Có AWD', without: 'Không có AWD', mixed: 'Có và không AWD',
  income: 'Thu nhập ròng', cost: 'Chi phí sản xuất', straw: 'Giá trị rơm', roi: 'Tỷ suất hoàn vốn', margin: 'Tỷ suất lợi nhuận', yield: 'Năng suất trung bình', labor: 'Cường độ lao động',
}
const en: Record<keyof typeof vi, string> = {
  title: 'Economic viability overview', filters: 'Filter scenarios', all: 'All', reset: 'Clear filters', results: 'Results by scenario', scenario: 'scenarios',
  historical: 'Current conditions', noResults: 'No matching scenarios', noResultsDescription: 'Change your selection or clear filters to view every scenario.',
  scenarioColumns: 'Scenario information', financialColumns: 'Financial performance', productionColumns: 'Production',
  tableCaption: 'Mean economic indicators by scenario', mobileResults: 'Economic scenarios', sort: 'Sort by', unit: 'Unit',
  roiNote: 'Mean net income / Mean production cost × 100%.',
  moneyUnit: '$/ha', yieldUnit: 't/ha', laborUnit: 'hours/ha',
  group: 'Scenario group', season: 'Season type', climate: 'Weather', resource: 'Resource scenario', awd: 'AWD adoption',
  bau: 'Business as usual', oneMha: '1Mha', sustainable: 'Sustainable', threeSeasons: '3 seasons', twoSeasons: '2 seasons', mild: 'Normal', severe: 'Severe weather', normal: 'Normal economy', neutral: 'Neutral', shortage: 'Resource shortage', with: 'With AWD', without: 'Without AWD', mixed: 'With and without AWD',
  income: 'Net income', cost: 'Production cost', straw: 'Straw value', roi: 'Return on investment', margin: 'Profit margin', yield: 'Average yield', labor: 'Labor intensity',
}
export const economicsText = { vi, en }
export const economicFacets: { key: keyof EconomicFilters; options: (keyof typeof vi)[] }[] = [
  { key: 'group', options: ['bau', 'oneMha'] },
  { key: 'season', options: ['sustainable', 'threeSeasons', 'twoSeasons'] },
  { key: 'climate', options: ['mild', 'severe'] },
  { key: 'resource', options: ['normal', 'neutral', 'shortage'] },
  { key: 'awd', options: ['with', 'without', 'mixed'] },
]
export const economicMetricUnits: Record<EconomicMetric, 'moneyUnit' | 'yieldUnit' | 'laborUnit' | '%'> = { income: 'moneyUnit', cost: 'moneyUnit', straw: 'moneyUnit', roi: '%', margin: '%', yield: 'yieldUnit', labor: 'laborUnit' }
