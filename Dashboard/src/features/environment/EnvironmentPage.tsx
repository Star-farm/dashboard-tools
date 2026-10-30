import { lazy, Suspense, useEffect } from 'react'
import type { Language } from '../../i18n'
import { getScrollBehavior } from '../../app/scrollBehavior'
import cached from '../../data/environment-overview.json'
import type { EnvironmentData } from './environmentTypes'
import { environmentText } from './environmentText'
import { environmentPageTitle, environmentRoutes } from './environmentRoutes'
import type { EnvironmentContentPage } from './environmentRoutes'
import EnvironmentOverview from './EnvironmentOverview'
import '../../styles/economics.css'
import '../../styles/economic-comparison.css'
import '../../styles/scenarios.css'
import '../../styles/bau3-comparison.css'
import '../../styles/bau-farming.css'
import '../../styles/environment.css'

const EnvironmentCharts = lazy(() => import('./EnvironmentCharts'))
const overview = cached as Pick<EnvironmentData, 'rows' | 'startYear' | 'endYear'>

export default function EnvironmentPage({ page, language }: { page: EnvironmentContentPage; language: Language }) {
  const route = environmentRoutes[page]
  useEffect(() => { document.getElementById(route.anchor)?.scrollIntoView?.({ block: 'start', behavior: getScrollBehavior() }) }, [route.anchor])
  return <div className={`environment-page economics-page bau3-page page-shell${route.kind === 'farming' ? ' bau-farming-page' : ''}`} id={route.anchor}>
    <section className={`intro${route.kind === 'farming' || route.kind === 'pair' ? ' bau3-intro' : ''}`} aria-labelledby="environment-title"><h1 id="environment-title">{environmentPageTitle(page, language)}</h1>{(route.kind === 'farming' || route.kind === 'pair') && <span>{overview.startYear}–{overview.endYear}</span>}</section>
    {page === 'environmentOverview' ? <EnvironmentOverview data={overview} language={language} /> : <Suspense fallback={<p role="status">{environmentText[language].loading}</p>}><EnvironmentCharts key={page} page={page} language={language} /></Suspense>}
  </div>
}
