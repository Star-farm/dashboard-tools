import { useEffect } from 'react'
import { getScrollBehavior } from '../../app/scrollBehavior'
import { translations } from '../../i18n'
import type { Language } from '../../i18n'
import { economicExploreText } from './economicExploreText'
import { resourceText } from '../resources/resourceText'
import { environmentText } from '../environment/environmentText'
import '../../styles/economic-explore.css'

export default function EconomicExplorePage({ language, topic = 'economics' }: { language: Language; topic?: 'economics' | 'resources' | 'sustainability' }) {
  const t = translations[language]
  const prefix = topic === 'sustainability' ? 'environment' : topic
  const resources = resourceText[language]
  const title = topic === 'sustainability' ? t.environmentExploreTitle : topic === 'resources' ? t.resourceExploreTitle : t.economicExploreTitle
  const text = topic === 'sustainability' ? {
    description: environmentText[language].description,
    overview: language === 'vi' ? 'Xem các chỉ số phát thải theo kịch bản hoặc so sánh thường lệ với 1Mha.' : 'View emission indicators by scenario or compare business as usual with 1Mha.',
    comparison: language === 'vi' ? 'So sánh phát thải Metan và cường độ phát thải giữa từng mô hình thường lệ và 1Mha qua thời gian.' : 'Compare methane emissions and emission intensity between each business-as-usual model and 1Mha over time.',
    bau: language === 'vi' ? 'Xem KPI môi trường, tỷ lệ áp dụng AWD và diễn biến phát thải của từng mô hình thường lệ.' : 'Explore environmental KPIs, AWD adoption and emission trends for each business-as-usual model.',
    oneMha: language === 'vi' ? 'Theo dõi các chỉ số môi trường của mô hình lúa chất lượng cao, phát thải thấp 1Mha.' : 'Track environmental indicators for the high-quality, low-emission 1Mha rice model.',
    oneMhaLink: economicExploreText[language].oneMhaLink,
  } : topic === 'resources' ? {
    description: resources.description,
    overview: language === 'vi' ? 'Xem các chỉ số tài nguyên theo kịch bản hoặc so sánh thường lệ với 1Mha.' : 'View resource indicators by scenario or compare business as usual with 1Mha.',
    comparison: language === 'vi' ? 'So sánh diễn biến sử dụng nước, phân bón và thuốc trừ sâu giữa từng mô hình thường lệ và 1Mha.' : 'Compare water, fertilizer and pesticide trajectories between each business-as-usual model and 1Mha.',
    bau: language === 'vi' ? 'Xem KPI, diễn biến và nhận xét tài nguyên của từng mô hình thường lệ.' : 'Explore resource KPIs, trends and findings for each business-as-usual model.',
    oneMha: language === 'vi' ? 'Theo dõi việc sử dụng đầu vào của mô hình lúa chất lượng cao, phát thải thấp 1Mha.' : 'Track input use for the high-quality, low-emission 1Mha rice model.',
    oneMhaLink: economicExploreText[language].oneMhaLink,
  } : economicExploreText[language]
  const groups: { id: string; title: string; description: string; items: { label: string; href: string }[] }[] = [
    { id: 'overview', title: t.menuOverview, description: text.overview, items: [
      { label: t.menuInformation, href: `#${prefix}-overview` },
      { label: t.menuComparisonTable, href: `#${prefix}-comparison` },
    ] },
    { id: 'comparison', title: t.menuComparison, description: text.comparison, items: [
      { label: 'BAU3S vs 1Mha', href: `#${prefix}-bau3-vs-1mha` },
      { label: 'BAU2S vs 1Mha', href: `#${prefix}-bau2-vs-1mha` },
      { label: 'BAUSS vs 1Mha', href: `#${prefix}-bauss-vs-1mha` },
    ] },
    { id: 'bau', title: t.menuBau, description: text.bau, items: [
      { label: t.menuThreeSeasons, href: `#${prefix}-bau3` },
      { label: t.menuTwoSeasons, href: `#${prefix}-bau2` },
      { label: t.menuSustainable, href: `#${prefix}-bauss` },
    ] },
    { id: 'one-mha', title: t.menuOneMha, description: text.oneMha, items: [{ label: text.oneMhaLink, href: `#${prefix}-1mha` }] },
  ]

  useEffect(() => {
    const hash = window.location.hash.slice(1)
    const target = ['overview', 'comparison', 'bau'].some((branch) => hash === `${prefix}-explore-${branch}`) ? hash : `${prefix}-explore`
    document.getElementById(target)?.scrollIntoView?.({ block: 'start', behavior: getScrollBehavior() })
  }, [prefix])

  return (
    <div className="economic-explore-page page-shell" id={`${prefix}-explore`}>
      <section className="intro economic-explore-intro" aria-labelledby="economic-explore-title">
        <h1 id="economic-explore-title">{title}</h1>
        <p>{text.description}</p>
      </section>
      <div className="economic-explore-grid">{groups.map((group) => (
        <section className="economic-explore-card" id={`${prefix}-explore-${group.id}`} key={group.id} aria-labelledby={`explore-${group.id}-title`}>
          <header><h2 id={`explore-${group.id}-title`}>{group.title}</h2><p>{group.description}</p></header>
          <ul>{group.items.map((item) => <li key={item.label}>
            <a href={item.href}><span>{item.label}</span><span aria-hidden="true">→</span></a>
          </li>)}</ul>
        </section>
      ))}</div>
    </div>
  )
}
