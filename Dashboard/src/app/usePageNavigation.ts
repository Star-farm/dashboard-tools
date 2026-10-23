import { useEffect, useState } from 'react'
import { getScrollBehavior } from './scrollBehavior'
import { resourcePageForHash } from '../features/resources/resourceRoutes'
import type { ResourcePage } from '../features/resources/resourceRoutes'
import { environmentPageForHash } from '../features/environment/environmentRoutes'
import type { EnvironmentPage } from '../features/environment/environmentRoutes'

export type Page = 'home' | 'glossary' | 'future' | 'scenario' | 'economics' | 'economicExplore' | 'economicComparison' | 'bau3Comparison' | 'bau2Comparison' | 'baussComparison' | 'bau3Farming' | 'bau2Farming' | 'baussFarming' | 'oneMhaFarming' | ResourcePage | EnvironmentPage

function pageForHash(hash: string, previous: Page = 'home'): Page {
  const environmentPage = environmentPageForHash(hash)
  if (environmentPage) return environmentPage
  const resourcePage = resourcePageForHash(hash)
  if (resourcePage) return resourcePage
  if (hash === '#economics-explore') return 'economicExplore'
  if (hash === '#economics-overview') return 'economics'
  if (hash === '#economics-comparison') return 'economicComparison'
  if (hash === '#economics-bau3-vs-1mha') return 'bau3Comparison'
  if (hash === '#economics-bau2-vs-1mha') return 'bau2Comparison'
  if (hash === '#economics-bauss-vs-1mha') return 'baussComparison'
  if (hash === '#economics-bau3') return 'bau3Farming'
  if (hash === '#economics-bau2') return 'bau2Farming'
  if (hash === '#economics-bauss') return 'baussFarming'
  if (hash === '#economics-1mha') return 'oneMhaFarming'
  if (['#future', '#future-income', '#future-labor', '#future-methane'].includes(hash)) return 'future'
  if (['#scenario-details', '#scenario-economics', '#scenario-resources', '#scenario-sustainability'].includes(hash)) return 'scenario'
  if (['#glossary', '#search-panel', '#definitions'].includes(hash)) return 'glossary'
  if (['', '#home', '#home-explore', '#datasets'].includes(hash)) return 'home'
  return previous
}

export function usePageNavigation() {
  const [{ hash, page }, setLocation] = useState(() => ({ hash: window.location.hash, page: pageForHash(window.location.hash) }))

  useEffect(() => {
    const update = () => setLocation((previous) => ({ hash: window.location.hash, page: pageForHash(window.location.hash, previous.page) }))
    window.addEventListener('hashchange', update)
    return () => window.removeEventListener('hashchange', update)
  }, [])

  useEffect(() => {
    const target = document.getElementById(hash.slice(1) || 'home') ?? document.getElementById('main-content')
    target?.scrollIntoView?.({ block: 'start', behavior: getScrollBehavior() })
  }, [hash, page])

  return { page, hash }
}
