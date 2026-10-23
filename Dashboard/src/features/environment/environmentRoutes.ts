import type { Language } from '../../i18n'
import { environmentText } from './environmentText'

export const environmentRoutes = {
  environmentOverview: { anchor: 'environment-overview', kind: 'overview' },
  environmentComparison: { anchor: 'environment-comparison', kind: 'bars' },
  environmentBau3Comparison: { anchor: 'environment-bau3-vs-1mha', kind: 'pair', family: 'bau3s' },
  environmentBau2Comparison: { anchor: 'environment-bau2-vs-1mha', kind: 'pair', family: 'bau2s' },
  environmentBaussComparison: { anchor: 'environment-bauss-vs-1mha', kind: 'pair', family: 'bauss' },
  environmentBau3: { anchor: 'environment-bau3', kind: 'farming', family: 'bau3s' },
  environmentBau2: { anchor: 'environment-bau2', kind: 'farming', family: 'bau2s' },
  environmentBauss: { anchor: 'environment-bauss', kind: 'farming', family: 'bauss' },
  environmentOneMha: { anchor: 'environment-1mha', kind: 'farming', family: 'oneMha' },
} as const
export type EnvironmentContentPage = keyof typeof environmentRoutes
export type EnvironmentPage = EnvironmentContentPage | 'environmentExplore'
export function isEnvironmentPage(page: string): page is EnvironmentPage { return page === 'environmentExplore' || page in environmentRoutes }
export function environmentPageForHash(hash: string): EnvironmentPage | undefined {
  if (hash === '#environment-explore') return 'environmentExplore'
  return (Object.keys(environmentRoutes) as EnvironmentContentPage[]).find((key) => `#${environmentRoutes[key].anchor}` === hash)
}
export function environmentPageTitle(page: EnvironmentPage, language: Language) {
  const t = environmentText[language]
  if (page === 'environmentExplore') return t.exploreTitle
  const route = environmentRoutes[page]
  if (route.kind === 'overview') return t.title
  if (route.kind === 'bars') return t.comparisonTitle
  return route.kind === 'pair'
    ? `${language === 'vi' ? 'Môi trường' : 'Environment'} · ${{ bau3s: t.bau3Short, bau2s: t.bau2Short, bauss: t.baussShort }[route.family]} ${language === 'vi' ? 'so với' : 'vs'} 1Mha`
    : `${language === 'vi' ? 'Môi trường' : 'Environment'} · ${t[route.family]}`
}
export function environmentDestination(branch: 'overview' | 'comparison' | 'bau', index: number) {
  const pages: Record<typeof branch, EnvironmentContentPage[]> = {
    overview: ['environmentOverview', 'environmentComparison'],
    comparison: ['environmentBau3Comparison', 'environmentBau2Comparison', 'environmentBaussComparison'],
    bau: ['environmentBau3', 'environmentBau2', 'environmentBauss'],
  }
  const page = pages[branch][index]
  return page ? { page, href: `#${environmentRoutes[page].anchor}` } : undefined
}
