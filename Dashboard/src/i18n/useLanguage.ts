import { useEffect, useState } from 'react'
import { getInitialLanguage, LANGUAGE_STORAGE_KEY, translations } from './index'
import type { Language } from './index'
import type { Page } from '../app/usePageNavigation'
import { exploreBranches } from '../app/exploreNavigation'
import type { ExploreBranch } from '../app/exploreNavigation'
import { isResourcePage, resourcePageTitle } from '../features/resources/resourceRoutes'
import { resourceText } from '../features/resources/resourceText'
import { isEnvironmentPage, environmentPageTitle } from '../features/environment/environmentRoutes'
import { environmentText } from '../features/environment/environmentText'

export function useLanguage(page: Page = 'glossary', branch?: ExploreBranch) {
  const [language, setLanguage] = useState(getInitialLanguage)
  const t = translations[language]

  useEffect(() => {
    document.documentElement.lang = language === 'en' ? 'en-US' : 'vi'
    if (branch && ['economicExplore', 'resourceExplore', 'environmentExplore'].includes(page)) {
      const topic = page === 'economicExplore' ? t.topicEconomics : page === 'resourceExplore' ? t.topicResources : t.topicSustainability
      document.title = `${t[exploreBranches.find((item) => item.id === branch)!.label]} · ${topic} | STAR FARM`
      document.querySelector('meta[name="description"]')?.setAttribute('content', page === 'economicExplore' ? t.economicExplorePageDescription : page === 'resourceExplore' ? resourceText[language].description : environmentText[language].description)
      return
    }
    if (isEnvironmentPage(page)) {
      document.title = `${environmentPageTitle(page, language)} | STAR FARM`
      document.querySelector('meta[name="description"]')?.setAttribute('content', environmentText[language].description)
      return
    }
    if (isResourcePage(page)) {
      document.title = `${resourcePageTitle(page, language)} | STAR FARM`
      document.querySelector('meta[name="description"]')?.setAttribute('content', resourceText[language].description)
      return
    }
    const titles = {
      home: t.homePageTitle, future: t.futurePageTitle, scenario: t.scenarioPageTitle,
      economics: t.economicsPageTitle, economicExplore: t.economicExplorePageTitle, economicComparison: t.economicComparisonPageTitle,
      bau3Comparison: t.bau3ComparisonPageTitle, bau2Comparison: t.bau2ComparisonPageTitle, baussComparison: t.baussComparisonPageTitle,
      bau3Farming: t.bau3FarmingPageTitle, bau2Farming: t.bau2FarmingPageTitle, baussFarming: t.baussFarmingPageTitle, oneMhaFarming: t.oneMhaFarmingPageTitle,
      glossary: t.pageTitle, notFound: '404 | STAR FARM',
    }
    const descriptions = {
      home: t.homePageDescription, future: t.futurePageDescription, scenario: t.scenarioPageDescription,
      economics: t.economicsPageDescription, economicExplore: t.economicExplorePageDescription, economicComparison: t.economicComparisonPageDescription,
      bau3Comparison: t.bau3ComparisonPageDescription, bau2Comparison: t.bau2ComparisonPageDescription, baussComparison: t.baussComparisonPageDescription,
      bau3Farming: t.bau3FarmingPageDescription, bau2Farming: t.bau2FarmingPageDescription, baussFarming: t.baussFarmingPageDescription, oneMhaFarming: t.oneMhaFarmingPageDescription,
      glossary: t.pageDescription, notFound: t.notFoundDescription,
    }
    document.title = titles[page]
    document.querySelector('meta[name="description"]')?.setAttribute('content', descriptions[page])
  }, [language, t, page, branch])

  function changeLanguage(next: Language) {
    setLanguage(next)
    try {
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, next)
    } catch {
      // Switching stays available when browser storage is blocked.
    }
  }

  return { language, changeLanguage, t }
}
