import { lazy, Suspense, useEffect } from 'react'
import type { Language } from '../../i18n'
import { getScrollBehavior } from '../../app/scrollBehavior'
import cached from '../../data/resources-overview.json'
import type { ResourceData } from './resourceTypes'
import { resourceText } from './resourceText'
import { resourcePageTitle, resourceRoutes } from './resourceRoutes'
import type { ResourceContentPage } from './resourceRoutes'
import ResourceOverview from './ResourceOverview'
import '../../styles/economics.css'
import '../../styles/economic-comparison.css'
import '../../styles/scenarios.css'
import '../../styles/bau3-comparison.css'
import '../../styles/bau-farming.css'
import '../../styles/resources.css'

const ResourceCharts = lazy(() => import('./ResourceCharts'))
const overview = cached as Pick<ResourceData, 'rows' | 'startYear' | 'endYear'>

export default function ResourcesPage({ page, language }: { page: ResourceContentPage; language: Language }) {
  const route = resourceRoutes[page]
  useEffect(() => { document.getElementById(route.anchor)?.scrollIntoView?.({ block: 'start', behavior: getScrollBehavior() }) }, [route.anchor])
  return <div className={`resources-page economics-page bau3-page page-shell${route.kind === 'farming' ? ' bau-farming-page' : ''}`} id={route.anchor}>
    <section className={`intro${route.kind === 'farming' || route.kind === 'pair' ? ' bau3-intro' : ''}`} aria-labelledby="resources-title"><h1 id="resources-title">{resourcePageTitle(page, language)}</h1>{(route.kind === 'farming' || route.kind === 'pair') && <span>{overview.startYear}–{overview.endYear}</span>}</section>
    {page === 'resourceOverview' ? <ResourceOverview data={overview} language={language} /> : <Suspense fallback={<p role="status">{resourceText[language].loading}</p>}><ResourceCharts key={page} page={page} language={language} /></Suspense>}
  </div>
}
