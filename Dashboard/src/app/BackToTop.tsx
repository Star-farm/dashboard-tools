import { useSyncExternalStore } from 'react'
import { translations } from '../i18n'
import type { Language } from '../i18n'
import { getScrollBehavior } from './scrollBehavior'

function subscribeToScroll(onChange: () => void) {
  window.addEventListener('scroll', onChange, { passive: true })
  window.addEventListener('pageshow', onChange)
  return () => {
    window.removeEventListener('scroll', onChange)
    window.removeEventListener('pageshow', onChange)
  }
}

const isBelowTop = () => window.scrollY > 24

export default function BackToTop({ language }: { language: Language }) {
  const label = translations[language].backToTop
  const visible = useSyncExternalStore(subscribeToScroll, isBelowTop, () => false)

  function backToTop() {
    document.getElementById('main-content')?.focus({ preventScroll: true })
    window.scrollTo({ top: 0, left: 0, behavior: getScrollBehavior() })
  }

  return (
    <button className={`back-to-top${visible ? ' is-visible' : ''}`} type="button" aria-label={label} aria-hidden={!visible || undefined} disabled={!visible} tabIndex={visible ? 0 : -1} title={label} onClick={backToTop}>
      <span className="back-to-top-chevron" aria-hidden="true">{'>'}</span>
    </button>
  )
}
