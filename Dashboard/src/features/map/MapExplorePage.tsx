import type { Language } from '../../i18n'
import '../../styles/economic-explore.css'

export default function MapExplorePage({ language }: { language: Language }) {
  const vi = language === 'vi'
  const cards = [
    { id: 'farming', href: '#map', title: vi ? 'Bản đồ vùng canh tác' : 'Farming area map', description: vi ? 'Xem năng suất và thu nhập của các vùng canh tác theo năm, vụ và kịch bản.' : 'Explore farming area yield and income by year, harvest and scenario.' },
    { id: 'soil', href: '#soil-map', title: vi ? 'Bản đồ đất và ngập' : 'Soil and flooding map', description: vi ? 'Xem thành phần cơ giới, độ sâu phèn, độ sâu ngập và sử dụng đất trên bản đồ vùng canh tác.' : 'Explore soil texture, acid sulfate depth, flood depth and land use on farming area boundaries.' },
  ]
  return <div className="economic-explore-page page-shell" id="map-explore">
    <section className="intro economic-explore-intro" aria-labelledby="map-explore-title"><h1 id="map-explore-title">{vi ? 'Bản đồ' : 'Map'}</h1><p>{vi ? 'Khám phá các vùng canh tác và thông tin đất, ngập qua hai bản đồ.' : 'Explore farming areas and soil and flooding information through two maps.'}</p></section>
    <div className="economic-explore-grid">{cards.map((card) => <section key={card.id} className="economic-explore-card" aria-labelledby={`map-explore-${card.id}-title`}>
      <a className="explore-group-link" href={card.href} aria-labelledby={`map-explore-${card.id}-title`} aria-describedby={`map-explore-${card.id}-description`}>
        <div><h2 id={`map-explore-${card.id}-title`}>{card.title}</h2><p id={`map-explore-${card.id}-description`}>{card.description}</p></div><span aria-hidden="true">{'>'}</span>
      </a>
    </section>)}</div>
  </div>
}
