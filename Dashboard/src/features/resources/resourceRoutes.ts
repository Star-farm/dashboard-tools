import type { Language } from '../../i18n'
import { resourceText } from './resourceText'

export const resourceRoutes = {
  resourceOverview: { anchor: 'resources-overview', kind: 'overview' },
  resourceComparison: { anchor: 'resources-comparison', kind: 'bars' },
  resourceBau3Comparison: { anchor: 'resources-bau3-vs-1mha', kind: 'pair', family: 'bau3s' },
  resourceBau2Comparison: { anchor: 'resources-bau2-vs-1mha', kind: 'pair', family: 'bau2s' },
  resourceBaussComparison: { anchor: 'resources-bauss-vs-1mha', kind: 'pair', family: 'bauss' },
  resourceBau3: { anchor: 'resources-bau3', kind: 'farming', family: 'bau3s' },
  resourceBau2: { anchor: 'resources-bau2', kind: 'farming', family: 'bau2s' },
  resourceBauss: { anchor: 'resources-bauss', kind: 'farming', family: 'bauss' },
  resourceOneMha: { anchor: 'resources-1mha', kind: 'farming', family: 'oneMha' },
} as const
export type ResourceContentPage = keyof typeof resourceRoutes
export type ResourcePage = ResourceContentPage | 'resourceExplore'
export function isResourcePage(page: string): page is ResourcePage { return page === 'resourceExplore' || page in resourceRoutes }
export function resourcePageForHash(hash: string): ResourcePage | undefined {
  if (hash === '#resources-explore') return 'resourceExplore'
  return (Object.keys(resourceRoutes) as ResourceContentPage[]).find((key) => `#${resourceRoutes[key].anchor}` === hash)
}
export function resourcePageTitle(page: ResourcePage, language: Language) {
  const t = resourceText[language]
  if (page === 'resourceExplore') return t.exploreTitle
  const route = resourceRoutes[page]
  if (route.kind === 'overview') return t.title
  if (route.kind === 'bars') return t.comparisonTitle
  return route.kind === 'pair'
    ? `${language === 'vi' ? 'Tài nguyên' : 'Resources'} · ${{ bau3s: t.bau3Short, bau2s: t.bau2Short, bauss: t.baussShort }[route.family]} ${language === 'vi' ? 'so với' : 'vs'} 1Mha`
    : `${language === 'vi' ? 'Tài nguyên' : 'Resources'} · ${t[route.family]}`
}
export function resourceDestination(branch: 'overview' | 'comparison' | 'bau', index: number) {
  const pages: Record<typeof branch, ResourceContentPage[]> = {
    overview: ['resourceOverview', 'resourceComparison'],
    comparison: ['resourceBau3Comparison', 'resourceBau2Comparison', 'resourceBaussComparison'],
    bau: ['resourceBau3', 'resourceBau2', 'resourceBauss'],
  }
  const page = pages[branch][index]
  return page ? { page, href: `#${resourceRoutes[page].anchor}` } : undefined
}
