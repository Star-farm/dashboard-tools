import { lazy, Suspense } from 'react'
import Glossary from '../features/glossary/Glossary'
import HomePage from '../features/home/HomePage'
import SiteFooter from './SiteFooter'
import SiteHeader from './SiteHeader'
import BackToTop from './BackToTop'
import { useLanguage } from '../i18n/useLanguage'
import { usePageNavigation } from './usePageNavigation'

const FuturePage = lazy(() => import('../features/future/FuturePage'))
const ScenarioDetailsPage = lazy(() => import('../features/scenarios/ScenarioDetailsPage'))
const EconomicOverviewPage = lazy(() => import('../features/economics/EconomicOverviewPage'))
const EconomicComparisonPage = lazy(() => import('../features/economics/EconomicComparisonPage'))

export default function App() {
  const { page } = usePageNavigation()
  const { language, changeLanguage, t } = useLanguage(page)

  return (
    <>
      <a className="skip-link" href="#main-content">{t.skipContent}</a>
      <SiteHeader language={language} page={page} changeLanguage={changeLanguage} />
      <main id="main-content" tabIndex={-1}>
        {page === 'home' ? <HomePage language={language} /> : page === 'future' ? <Suspense fallback={<div className="future-loading page-shell" role="status"><p>{t.futureLoading}</p><div /><div /><div /></div>}><FuturePage language={language} /></Suspense> : page === 'scenario' ? <Suspense fallback={<div className="future-loading page-shell" role="status"><p>{t.scenarioLoading}</p><div /><div /><div /></div>}><ScenarioDetailsPage language={language} /></Suspense> : page === 'economics' ? <Suspense fallback={<div className="future-loading page-shell" role="status"><p>{t.economicsLoading}</p><div /></div>}><EconomicOverviewPage language={language} /></Suspense> : page === 'economicComparison' ? <Suspense fallback={<div className="future-loading page-shell" role="status"><p>{t.economicComparisonLoading}</p><div /></div>}><EconomicComparisonPage language={language} /></Suspense> : <Glossary language={language} />}
      </main>
      <SiteFooter language={language} />
      <BackToTop language={language} />
    </>
  )
}
