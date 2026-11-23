import { useEffect, useState } from 'react'
import { getInitialLanguage, LANGUAGE_STORAGE_KEY, translations } from './index'
import type { Language } from './index'
import type { Page } from '../app/usePageNavigation'
import { isResourcePage, resourcePageTitle } from '../features/resources/resourceRoutes'
import { resourceText } from '../features/resources/resourceText'
import { isEnvironmentPage, environmentPageTitle } from '../features/environment/environmentRoutes'
import { environmentText } from '../features/environment/environmentText'

export function useLanguage(page: Page = 'glossary') {
  const [language, setLanguage] = useState(getInitialLanguage)
  const t = translations[language]

  useEffect(() => {
    document.documentElement.lang = language === 'en' ? 'en-US' : 'vi'
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
      soilMap: language === 'vi' ? 'Bản đồ đất và ngập | STAR FARM' : 'Soil and flooding map | STAR FARM',
      map: language === 'vi' ? 'Bản đồ vùng canh tác | STAR FARM' : 'Farming area map | STAR FARM',
      home: t.homePageTitle, future: t.futurePageTitle, scenario: t.scenarioPageTitle,
      economics: t.economicsPageTitle, economicComparison: t.economicComparisonPageTitle,
      bau3Comparison: t.bau3ComparisonPageTitle, bau2Comparison: t.bau2ComparisonPageTitle, baussComparison: t.baussComparisonPageTitle,
      bau3Farming: t.bau3FarmingPageTitle, bau2Farming: t.bau2FarmingPageTitle, baussFarming: t.baussFarmingPageTitle, oneMhaFarming: t.oneMhaFarmingPageTitle,
      glossary: t.pageTitle, notFound: '404 | STAR FARM',
    }
    const descriptions = {
      soilMap: language === 'vi' ? 'Xem thông tin đất, độ sâu ngập và sử dụng đất trên ranh giới vùng canh tác.' : 'View soil, flood depth and land use on farming area boundaries.',
      map: language === 'vi' ? 'Bản đồ năng suất và thu nhập theo mùa vụ tại 992 vùng canh tác mô phỏng ở Đồng Tháp.' : 'Explore yield and income by crop season across 992 simulated farming areas in Dong Thap.',
      home: t.homePageDescription, future: t.futurePageDescription, scenario: t.scenarioPageDescription,
      economics: t.economicsPageDescription, economicComparison: t.economicComparisonPageDescription,
      bau3Comparison: t.bau3ComparisonPageDescription, bau2Comparison: t.bau2ComparisonPageDescription, baussComparison: t.baussComparisonPageDescription,
      bau3Farming: t.bau3FarmingPageDescription, bau2Farming: t.bau2FarmingPageDescription, baussFarming: t.baussFarmingPageDescription, oneMhaFarming: t.oneMhaFarmingPageDescription,
      glossary: t.pageDescription, notFound: t.notFoundDescription,
    }
    document.title = titles[page]
    document.querySelector('meta[name="description"]')?.setAttribute('content', descriptions[page])
  }, [language, t, page])

  function changeLanguage(next: Language) {
    setLanguage(next)
    try {
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, next)
    } catch {
      return
    }
  }

  return { language, changeLanguage, t }
}
