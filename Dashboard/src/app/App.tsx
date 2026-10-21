import { lazy, Suspense } from 'react'
import Glossary from '../features/glossary/Glossary'
import HomePage from '../features/home/HomePage'
import SiteFooter from './SiteFooter'
import HeaderNavigation from './HeaderNavigation'
import { useLanguage } from '../i18n/useLanguage'
import { usePageNavigation } from './usePageNavigation'

const FuturePage = lazy(() => import('../features/future/FuturePage'))
const ScenarioDetailsPage = lazy(() => import('../features/scenarios/ScenarioDetailsPage'))

export default function App() {
  const { page } = usePageNavigation()
  const { language, changeLanguage, t } = useLanguage(page)

  return (
    <>
      <a className="skip-link" href="#main-content">{t.skipContent}</a>
      <header className="site-header">
        <div className="header-inner">
          <a className="brand" href="#home" aria-label={t.homeLabel}>
            <span className="brand-name">STAR-FARM</span>
          </a>
          <HeaderNavigation language={language} page={page} />
          <div className="language-switcher" role="group" aria-label={t.language}>
            <button type="button" lang="vi" aria-label="Tiếng Việt" title="Tiếng Việt" aria-pressed={language === 'vi'} onClick={() => changeLanguage('vi')}>VI</button>
            <button type="button" lang="en" aria-label="English" title="English" aria-pressed={language === 'en'} onClick={() => changeLanguage('en')}>EN</button>
          </div>
        </div>
      </header>
      <main id="main-content" tabIndex={-1}>
        {page === 'home' ? <HomePage language={language} /> : page === 'future' ? <Suspense fallback={<div className="future-loading page-shell" role="status"><p>{t.futureLoading}</p><div /><div /><div /></div>}><FuturePage language={language} /></Suspense> : page === 'scenario' ? <Suspense fallback={<div className="future-loading page-shell" role="status"><p>{t.scenarioLoading}</p><div /><div /><div /></div>}><ScenarioDetailsPage language={language} /></Suspense> : <Glossary language={language} />}
      </main>
      <SiteFooter language={language} />
    </>
  )
}
