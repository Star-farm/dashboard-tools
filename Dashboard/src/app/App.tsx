import { lazy, Suspense } from 'react'
import type { ReactElement } from 'react'
import Glossary from '../features/glossary/Glossary'
import NotFoundPage from '../features/NotFoundPage'
import HomePage from '../features/home/HomePage'
import SiteFooter from './SiteFooter'
import SiteHeader from './SiteHeader'
import { PageBreadcrumbs } from './PageBreadcrumbs'
import BackToTop from './BackToTop'
import { useLanguage } from '../i18n/useLanguage'
import { usePageNavigation } from './usePageNavigation'
import { isResourcePage, resourceRoutes } from '../features/resources/resourceRoutes'
import type { ResourceContentPage } from '../features/resources/resourceRoutes'
import { resourceText } from '../features/resources/resourceText'
import { environmentRoutes, isEnvironmentPage } from '../features/environment/environmentRoutes'
import type { EnvironmentContentPage } from '../features/environment/environmentRoutes'
import { environmentText } from '../features/environment/environmentText'
import '../styles/motion.css'

const FuturePage = lazy(() => import('../features/future/FuturePage'))
const ScenarioDetailsPage = lazy(() => import('../features/scenarios/ScenarioDetailsPage'))
const EconomicOverviewPage = lazy(() => import('../features/economics/EconomicOverviewPage'))
const EconomicExplorePage = lazy(() => import('../features/economics/EconomicExplorePage'))
const EconomicComparisonPage = lazy(() => import('../features/economics/EconomicComparisonPage'))
const Bau3ComparisonPage = lazy(() => import('../features/economics/Bau3ComparisonPage'))
const Bau2ComparisonPage = lazy(() => import('../features/economics/Bau2ComparisonPage'))
const BauSustainableComparisonPage = lazy(() => import('../features/economics/BauSustainableComparisonPage'))
const Bau3FarmingPage = lazy(() => import('../features/economics/Bau3FarmingPage'))
const Bau2FarmingPage = lazy(() => import('../features/economics/Bau2FarmingPage'))
const BauSustainableFarmingPage = lazy(() => import('../features/economics/BauSustainableFarmingPage'))
const OneMhaFarmingPage = lazy(() => import('../features/economics/OneMhaFarmingPage'))
const ResourcesPage = lazy(() => import('../features/resources/ResourcesPage'))
const EnvironmentPage = lazy(() => import('../features/environment/EnvironmentPage'))

export default function App() {
  const { page, branch } = usePageNavigation()
  const { language, changeLanguage, t } = useLanguage(page, branch)
  const resourcePages = Object.fromEntries((Object.keys(resourceRoutes) as ResourceContentPage[]).map((key) => [key, <ResourcesPage key={key} page={key} language={language} />])) as Record<ResourceContentPage, ReactElement>
  const environmentPages = Object.fromEntries((Object.keys(environmentRoutes) as EnvironmentContentPage[]).map((key) => [key, <EnvironmentPage key={key} page={key} language={language} />])) as Record<EnvironmentContentPage, ReactElement>
  const pages = {
    ...resourcePages,
    ...environmentPages,
    environmentExplore: <EconomicExplorePage language={language} topic="sustainability" branch={branch} />,
    resourceExplore: <EconomicExplorePage language={language} topic="resources" branch={branch} />,
    home: <HomePage language={language} />,
    notFound: <NotFoundPage language={language} />,
    glossary: <Glossary language={language} />,
    future: <FuturePage language={language} />,
    scenario: <ScenarioDetailsPage language={language} />,
    economics: <EconomicOverviewPage language={language} />,
    economicExplore: <EconomicExplorePage language={language} branch={branch} />,
    economicComparison: <EconomicComparisonPage language={language} />,
    bau3Comparison: <Bau3ComparisonPage language={language} />,
    bau2Comparison: <Bau2ComparisonPage language={language} />,
    baussComparison: <BauSustainableComparisonPage language={language} />,
    bau3Farming: <Bau3FarmingPage language={language} />,
    bau2Farming: <Bau2FarmingPage language={language} />,
    baussFarming: <BauSustainableFarmingPage language={language} />,
    oneMhaFarming: <OneMhaFarmingPage language={language} />,
  }
  const loadingText = isEnvironmentPage(page) ? environmentText[language].loading : isResourcePage(page) ? resourceText[language].loading : {
    home: '', glossary: '', notFound: '', future: t.futureLoading, scenario: t.scenarioLoading,
    economics: t.economicsLoading, economicComparison: t.economicComparisonLoading,
    economicExplore: t.economicExploreLoading,
    bau3Comparison: t.bau3ComparisonLoading, bau2Comparison: t.bau2ComparisonLoading,
    baussComparison: t.baussComparisonLoading,
    bau3Farming: t.bau3FarmingLoading,
    bau2Farming: t.bau2FarmingLoading,
    baussFarming: t.baussFarmingLoading,
    oneMhaFarming: t.oneMhaFarmingLoading,
  }[page]

  return (
    <>
      <a className="skip-link" href="#main-content">{t.skipContent}</a>
      <SiteHeader language={language} page={page} changeLanguage={changeLanguage} />
      <main id="main-content" tabIndex={-1}>
        <div className="page-transition" key={`${page}-${branch ?? 'root'}`}>
          <PageBreadcrumbs page={page} language={language} branch={branch} />
          <Suspense fallback={<div className="future-loading page-shell" role="status"><p>{loadingText}</p><div />{(page === 'future' || page === 'scenario') && <><div /><div /></>}</div>}>{pages[page]}</Suspense>
        </div>
      </main>
      <SiteFooter language={language} />
      <BackToTop language={language} />
    </>
  )
}
