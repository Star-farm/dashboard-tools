const vi = {
  title: 'So sánh kinh tế', filters: 'Lọc biểu đồ so sánh', average: 'Trung bình',
  allWeather: 'Tất cả thời tiết', allResources: 'Tất cả tài nguyên', reset: 'Xóa bộ lọc',
  normalResource: 'Bình thường',
  income: 'Thu nhập ròng trung bình', straw: 'Giá trị rơm trung bình', cost: 'Chi phí sản xuất trung bình', yield: 'Năng suất trung bình', labor: 'Cường độ lao động trung bình',
  noData: 'Không có dữ liệu cho lựa chọn này.', unavailable: 'Chưa có dữ liệu',
}
const en: Record<keyof typeof vi, string> = {
  title: 'Economic comparison', filters: 'Filter comparison charts', average: 'Average',
  allWeather: 'All weather', allResources: 'All resources', reset: 'Clear filters',
  normalResource: 'Normal',
  income: 'Average net income', straw: 'Average straw value', cost: 'Average production cost', yield: 'Average yield', labor: 'Average labor intensity',
  noData: 'No data for this selection.', unavailable: 'No data',
}
export const comparisonText = { vi, en }
