const vi = {
  filters: 'Bộ lọc phân tích theo vụ',
  title: 'Phân tích theo từng vụ', description: 'So sánh các mùa vụ theo trung bình toàn bộ giai đoạn, chọn một năm cụ thể hoặc theo dõi cùng một vụ qua nhiều năm.',
  withinYear: 'Giữa các vụ', overTime: 'Qua nhiều năm', view: 'Cách xem', year: 'Năm', allYears: 'Tất cả năm', period: 'Mùa vụ', condition: 'Điều kiện kịch bản', system: 'Hệ canh tác',
  early: 'Đông Xuân', middle: 'Hè Thu', late: 'Thu Đông',
  notGrown: 'Không canh tác', notGrownNote: 'Hệ canh tác 2 vụ và 1Mha chỉ canh tác Đông Xuân và Hè Thu, không canh tác Thu Đông.',
  average: 'Trung bình theo vụ', noData: 'Không có dữ liệu',
  allModels: 'Cả hai mô hình', modelFilter: 'Chọn mô hình', bau3s: 'BAU 3 vụ', bau2s: 'BAU 2 vụ', bauss: 'BAU bền vững', oneMha: '1Mha',
  baseline: 'Hệ canh tác đối chiếu', hint: 'Bấm hoặc chạm vào biểu đồ để xem số liệu.',
  insight: 'Nhận xét', common: 'Chỉ so sánh các vụ được canh tác ở cả hai mô hình.',
  noPair: 'Chưa có đủ dữ liệu chung để tính chênh lệch giữa hai mô hình.', selected: 'Số liệu đang chọn', summary: 'Phạm vi phân tích',
  comparison: '1Mha so với', periodMean: 'Chênh lệch trung bình trên những năm có dữ liệu chung',
  trend: 'Thay đổi từ năm đầu đến năm cuối có dữ liệu', highest: 'Cao nhất', lowest: 'thấp nhất', table: 'Bảng thông tin theo mùa vụ',
}
const en: Record<keyof typeof vi, string> = {
  filters: 'Seasonal analysis filters',
  title: 'Seasonal analysis', description: 'Compare crop seasons using averages across all years, select a specific year, or follow the same season across years.',
  withinYear: 'Across crop seasons', overTime: 'Across years', view: 'View', year: 'Year', allYears: 'All years', period: 'Crop season', condition: 'Scenario conditions', system: 'Farming system',
  early: 'Winter–Spring', middle: 'Summer–Fall', late: 'Fall–Winter',
  notGrown: 'Not grown', notGrownNote: 'The two-crop system and 1Mha grow Winter–Spring and Summer–Fall crops, with no Fall–Winter crop.',
  average: 'Mean by crop season', noData: 'No data', allModels: 'Both models', modelFilter: 'Choose models',
  bau3s: 'BAU 3 seasons', bau2s: 'BAU 2 seasons', bauss: 'BAU sustainable', oneMha: '1Mha',
  baseline: 'Baseline farming system', hint: 'Click or tap the chart to inspect values.',
  insight: 'What the comparison shows', common: 'Comparisons use only seasons cultivated by both models.',
  noPair: 'There is not enough shared data to calculate a difference between the models.', selected: 'Selected values', summary: 'Analysis scope',
  comparison: '1Mha versus', periodMean: 'Mean difference across years with data for both models',
  trend: 'Change from the first to the last year with data', highest: 'Highest', lowest: 'lowest', table: 'Seasonal information dashboard',
}
export const seasonalText = { vi, en }
