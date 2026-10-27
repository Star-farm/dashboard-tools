export const exploreBranches = [
  { id: 'overview', label: 'menuOverview' },
  { id: 'comparison', label: 'menuComparison' },
  { id: 'bau', label: 'menuBau' },
] as const

export type ExploreBranch = typeof exploreBranches[number]['id']
export type ExplorePrefix = 'economics' | 'resources' | 'environment'

export function exploreRouteForHash(hash: string): { prefix: ExplorePrefix; branch: ExploreBranch } | undefined {
  const match = /^#(economics|resources|environment)-explore-(overview|comparison|bau)$/.exec(hash)
  return match ? { prefix: match[1] as ExplorePrefix, branch: match[2] as ExploreBranch } : undefined
}
