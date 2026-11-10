import type { Language } from '../../i18n'

const definitions = {
  vi: {
    title: 'Hiểu các loại đất trên bản đồ',
    items: [
      { name: 'Đất thịt', text: 'Đất có sự pha trộn của các hạt cát, bụi (limon) và sét, cùng thể hiện đặc tính của cả ba nhóm hạt. Không có nghĩa là mỗi thành phần chiếm một phần ba.' },
      { name: 'Đất sét – thịt', text: 'Tên hiển thị cho nhóm “Clay - Loam” trong dữ liệu nguồn, thể hiện sự kết hợp giữa đất sét và đất thịt.' },
      { name: 'Đất thịt – sét', text: 'Tên hiển thị cho nhóm “Loam - Clay”, được dữ liệu nguồn ghi riêng với nhóm đất sét – thịt.' },
    ],
    note: 'Nguồn chưa có chú giải chi tiết hoặc tỷ lệ cát, bụi và sét để phân biệt chính xác hai nhóm kết hợp. Tên gọi không đủ để kết luận độ phì, mức phèn hay mức độ phù hợp trồng lúa.',
    source: 'Tham khảo về thành phần cơ giới đất: Agriculture and Agri-Food Canada',
  },
  en: {
    title: 'Understanding soil types on the map',
    items: [
      { name: 'Loam soil', text: 'Soil containing sand, silt and clay, with the characteristics of all three particle groups apparent. This does not mean that each component makes up one third.' },
      { name: 'Clay – loam soil', text: 'The display name for the source category “Clay - Loam”, indicating a combination of clay and loam soils.' },
      { name: 'Loam – clay soil', text: 'The display name for “Loam - Clay”, recorded separately from clay – loam in the source dataset.' },
    ],
    note: 'The source lacks detailed definitions or sand, silt and clay percentages to distinguish the two combined categories precisely. These names alone do not establish fertility, acidity or suitability for rice cultivation.',
    source: 'Soil texture reference: Agriculture and Agri-Food Canada',
  },
}

export default function SoilDefinitions({ language }: { language: Language }) {
  const t = definitions[language]
  return <section className="soil-definitions" aria-labelledby="soil-definitions-title">
    <h2 id="soil-definitions-title">{t.title}</h2>
    <dl>{t.items.map((item) => <div key={item.name}><dt>{item.name}</dt><dd>{item.text}</dd></div>)}</dl>
    <p>{t.note}</p>
    <p><a href="https://agriculture.canada.ca/en/agricultural-production/soil-and-land/soil-and-water/soil" target="_blank" rel="noreferrer">{t.source}</a></p>
  </section>
}
