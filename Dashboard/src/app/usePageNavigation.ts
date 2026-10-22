import { useEffect, useState } from 'react'
import { getScrollBehavior } from './scrollBehavior'

export type Page = 'home' | 'glossary' | 'future' | 'scenario'

function pageForHash(hash: string, previous: Page = 'home'): Page {
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
