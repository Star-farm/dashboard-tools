import { translations } from '../i18n'
import type { Language } from '../i18n'
import { getScrollBehavior } from './scrollBehavior'

export default function BackToTop({ language }: { language: Language }) {
  const label = translations[language].backToTop

  function backToTop() {
    document.getElementById('main-content')?.focus({ preventScroll: true })
    window.scrollTo({ top: 0, left: 0, behavior: getScrollBehavior() })
  }

  return (
    <button className="back-to-top" type="button" aria-label={label} title={label} onClick={backToTop}>
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 19V5m-6 6 6-6 6 6" /></svg>
    </button>
  )
}
