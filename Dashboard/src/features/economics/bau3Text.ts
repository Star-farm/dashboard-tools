const vi = {
  title: 'BAU 3 vụ so với 1Mha', bau3s: 'Thường lệ · 3 mùa vụ', oneMha: '1Mha',
  bau2Title: 'BAU 2 vụ so với 1Mha', baussTitle: 'BAU bền vững so với 1Mha',
  bau2s: 'Thường lệ · 2 mùa vụ', bauss: 'Thường lệ · Bền vững',
  bau3Short: 'BAU 3 vụ', bau2Short: 'BAU 2 vụ', baussShort: 'BAU bền vững',
  oneMhaDescription: 'Lúa chất lượng cao, phát thải thấp',
  income: 'Thu nhập ròng', yield: 'Năng suất trung bình', labor: 'Cường độ lao động', cost: 'Chi phí sản xuất', margin: 'Tỷ suất lợi nhuận',
  severeShortage: 'Khắc nghiệt · Thiếu tài nguyên', severeNormal: 'Khắc nghiệt · Tài nguyên bình thường', mildShortage: 'Bình thường · Thiếu tài nguyên', mildNormal: 'Bình thường · Tài nguyên bình thường',
  unit: 'Đơn vị', moneyUnit: 'VNĐ/ha', yieldUnit: 'tấn/ha', laborUnit: 'giờ/ha', year: 'Năm', insight: 'Nhận xét', noData: 'Chưa đủ số liệu để so sánh.',
  overlap: 'Một số đường trùng nhau vì có cùng số liệu.',
}
const en: Record<keyof typeof vi, string> = {
  title: 'BAU 3 seasons vs 1Mha', bau3s: 'Business as usual · 3 seasons', oneMha: '1Mha',
  bau2Title: 'BAU 2 seasons vs 1Mha', baussTitle: 'BAU sustainable vs 1Mha',
  bau2s: 'Business as usual · 2 seasons', bauss: 'Business as usual · Sustainable',
  bau3Short: 'BAU 3 seasons', bau2Short: 'BAU 2 seasons', baussShort: 'BAU sustainable',
  oneMhaDescription: 'High-quality, low-emission rice',
  income: 'Net income', yield: 'Average yield', labor: 'Labor intensity', cost: 'Production cost', margin: 'Profit margin',
  severeShortage: 'Severe weather · Resource shortage', severeNormal: 'Severe weather · Normal resources', mildShortage: 'Normal weather · Resource shortage', mildNormal: 'Normal weather · Normal resources',
  unit: 'Unit', moneyUnit: '$/ha', yieldUnit: 't/ha', laborUnit: 'hours/ha', year: 'Year', insight: 'What the comparison shows', noData: 'Not enough data to compare.',
  overlap: 'Some lines overlap because their values are the same.',
}
export const bau3Text = { vi, en }
