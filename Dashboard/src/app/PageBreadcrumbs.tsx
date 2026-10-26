import { translations } from '../i18n'
import type { Language } from '../i18n'
import { resourceRoutes } from '../features/resources/resourceRoutes'
import { environmentRoutes } from '../features/environment/environmentRoutes'
import type { Page } from './usePageNavigation'
import '../styles/page-breadcrumbs.css'

const economicPaths = {
  economics: 'overview', economicComparison: 'comparison',
  bau3Comparison: 'bau3-vs-1mha', bau2Comparison: 'bau2-vs-1mha', baussComparison: 'bauss-vs-1mha',
  bau3Farming: 'bau3', bau2Farming: 'bau2', baussFarming: 'bauss', oneMhaFarming: '1mha',
} as const

export function PageBreadcrumbs({ page, language }: { page: Page; language: Language }) {
  if (page === 'home' || page === 'notFound') return null
  const t = translations[language]
  const items: { label: string; href?: string }[] = [{ label: t.navHome, href: '#home' }]
  const economicsPath = economicPaths[page as keyof typeof economicPaths]
  const resourceRoute = resourceRoutes[page as keyof typeof resourceRoutes]
  const environmentRoute = environmentRoutes[page as keyof typeof environmentRoutes]
  const prefix = economicsPath || page === 'economicExplore' ? 'economics'
    : resourceRoute || page === 'resourceExplore' ? 'resources'
      : environmentRoute || page === 'environmentExplore' ? 'environment' : undefined

  if (prefix) {
    const topicLabel = { economics: t.topicEconomics, resources: t.topicResources, environment: t.topicSustainability }[prefix]
    const path = economicsPath ?? (resourceRoute?.anchor ?? environmentRoute?.anchor)?.slice(prefix.length + 1)
    if (!path) {
      items.push({ label: topicLabel })
    } else {
      items.push({ label: topicLabel, href: `#${prefix}-explore` })
      if (path === 'overview' || path === 'comparison') {
        items.push({ label: t.menuOverview, href: `#${prefix}-explore-overview` })
        items.push({ label: path === 'overview' ? t.menuInformation : t.menuComparisonTable })
      } else if (path.endsWith('-vs-1mha')) {
        items.push({ label: t.menuComparison, href: `#${prefix}-explore-comparison` })
        items.push({ label: `${path.slice(0, -'-vs-1mha'.length).toUpperCase()}${path.startsWith('bauss') ? '' : 'S'} vs 1Mha` })
      } else if (path === '1mha') {
        items.push({ label: t.menuOneMha })
      } else {
        items.push({ label: t.menuBau, href: `#${prefix}-explore-bau` })
        items.push({ label: { bau3: t.menuThreeSeasons, bau2: t.menuTwoSeasons, bauss: t.menuSustainable }[path as 'bau3' | 'bau2' | 'bauss'] })
      }
    }
  } else {
    items.push({ label: { glossary: t.navGlossary, future: t.navFuture, scenario: t.navScenarioDetails }[page as 'glossary' | 'future' | 'scenario'] })
  }

  return <nav className="page-breadcrumbs page-shell" aria-label={language === 'vi' ? 'Đường dẫn trang' : 'Breadcrumb'}>
    <ol>{items.map((item, index) => <li key={`${index}-${item.label}`}>
      {index > 0 && <span className="breadcrumb-separator" aria-hidden="true">{'>'}</span>}
      {item.href ? <a href={item.href}>{item.label}</a> : <span aria-current="page">{item.label}</span>}
    </li>)}</ol>
  </nav>
}
