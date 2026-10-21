import { useEffect, useState } from 'react'
import { getInitialLanguage, LANGUAGE_STORAGE_KEY, translations } from './index'
import type { Language } from './index'
import type { Page } from '../app/usePageNavigation'

export function useLanguage(page: Page = 'glossary') {
  const [language, setLanguage] = useState(getInitialLanguage)
  const t = translations[language]

  useEffect(() => {
    document.documentElement.lang = language
    const titles = { home: t.homePageTitle, future: t.futurePageTitle, scenario: t.scenarioPageTitle, glossary: t.pageTitle }
    const descriptions = { home: t.homePageDescription, future: t.futurePageDescription, scenario: t.scenarioPageDescription, glossary: t.pageDescription }
    document.title = titles[page]
    document.querySelector('meta[name="description"]')?.setAttribute('content', descriptions[page])
  }, [language, t, page])

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
