import type { Language } from '../i18n'
import '../styles/page-help.css'

const descriptions = {
  vi: {
    economics: 'thu nhập, chi phí, năng suất và hiệu quả kinh tế',
    resources: 'lượng nước, phân bón và thuốc bảo vệ thực vật sử dụng',
    environment: 'phát thải metan và cường độ phát thải trong canh tác lúa',
    overview: 'Lọc theo điều kiện kịch bản để tra cứu và đối chiếu các chỉ số với hiện trạng.',
    bars: 'So sánh kết quả bình quân của BAU và 1Mha theo điều kiện thời tiết và tài nguyên.',
    pair: 'Đối chiếu BAU và 1Mha theo thời gian hoặc mùa vụ để nhận diện khác biệt giữa hai mô hình.',
    farming: 'Theo dõi các chỉ số chính, xu hướng qua các năm và sự khác biệt giữa các mùa vụ của mô hình này.',
    future: 'Theo dõi sự thay đổi của thu nhập, lao động và phát thải metan trong giai đoạn 2027–2050; chọn khoảng năm để xem chi tiết.',
    scenario: 'Chọn một kịch bản để xem các chỉ số kinh tế, sử dụng tài nguyên và môi trường, cùng mức thay đổi so với hiện trạng.',
    glossary: 'Tìm định nghĩa các chỉ số, phương pháp canh tác và điều kiện kịch bản bằng tiếng Việt hoặc tiếng Anh.',
  },
  en: {
    economics: 'income, costs, yield, and economic performance',
    resources: 'water, fertilizer, and pesticide use',
    environment: 'methane emissions and emission intensity in rice farming',
    overview: 'Filter scenario conditions to look up indicators and compare them with historical results.',
    bars: 'Compare average BAU and 1Mha outcomes under different weather and resource conditions.',
    pair: 'Compare BAU and 1Mha over time or by crop season to identify differences between the two systems.',
    farming: 'Explore key indicators, annual trends, and differences between crop seasons for this farming system.',
    future: 'Track changes in income, labor, and methane emissions from 2027 to 2050; select a year range to explore the results.',
    scenario: 'Select a scenario to explore economic, resource, and environmental indicators and their changes from historical conditions.',
    glossary: 'Find definitions of indicators, farming practices, and scenario conditions in English or Vietnamese.',
  },
}

export default function PageDescription({ language, kind, topic }: {
  language: Language
  kind: 'overview' | 'bars' | 'pair' | 'farming' | 'future' | 'scenario' | 'glossary'
  topic?: 'economics' | 'resources' | 'environment'
}) {
  const t = descriptions[language]
  return <p className="page-description">{topic ? `${language === 'vi' ? 'Khám phá' : 'Explore'} ${t[topic]}. ` : ''}{t[kind]}</p>
}
