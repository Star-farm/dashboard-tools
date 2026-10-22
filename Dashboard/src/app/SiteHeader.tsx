import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { translations } from '../i18n'
import type { Language } from '../i18n'
import type { Page } from './usePageNavigation'
import HeaderNavigation from './HeaderNavigation'
import { useHeaderScroll } from './useHeaderScroll'
import '../styles/mobile-navigation.css'
import '../styles/desktop-navigation.css'

const mobileQuery = '(max-width: 767px)'
const getMobileSnapshot = () => window.matchMedia?.(mobileQuery).matches ?? false
function subscribeToViewport(callback: () => void) {
  const query = window.matchMedia?.(mobileQuery)
  query?.addEventListener('change', callback)
  return () => query?.removeEventListener('change', callback)
}

function LanguageSwitcher({ language, changeLanguage, expanded = false }: {
  language: Language
  changeLanguage: (language: Language) => void
  expanded?: boolean
}) {
  return (
    <div className="language-switcher" role="group" aria-label={translations[language].language}>
      <button type="button" lang="vi" aria-label="Tiếng Việt" title="Tiếng Việt" aria-pressed={language === 'vi'} onClick={() => changeLanguage('vi')}>{expanded ? 'Tiếng Việt' : 'VI'}</button>
      <span className="language-divider" aria-hidden="true">|</span>
      <button type="button" lang="en" aria-label="English" title="English" aria-pressed={language === 'en'} onClick={() => changeLanguage('en')}>{expanded ? 'English' : 'EN'}</button>
    </div>
  )
}

function MobileMenu({ language, page, changeLanguage, open, setOpen }: {
  language: Language
  page: Page
  changeLanguage: (language: Language) => void
  open: boolean
  setOpen: (open: boolean) => void
}) {
  const t = translations[language]
  const dialogRef = useRef<HTMLDialogElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuHeadingRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const dialog = dialogRef.current
    const trigger = triggerRef.current
    const previousOverflow = document.body.style.overflow
    dialog?.showModal()
    menuHeadingRef.current?.focus({ preventScroll: true })
    document.body.style.overflow = 'hidden'
    return () => {
      dialog?.close()
      document.body.style.overflow = previousOverflow
      trigger?.focus({ preventScroll: true })
    }
  }, [open])

  return (
    <>
      <button className="mobile-menu-toggle" type="button" ref={triggerRef} aria-label={t.openMenu} aria-expanded={open} aria-controls="mobile-menu" aria-haspopup="dialog" onClick={() => setOpen(true)}>
        <span className="hamburger-icon" aria-hidden="true"><span /><span /><span /></span>
      </button>
      <dialog className="mobile-menu" id="mobile-menu" aria-label={t.mainNavigation} ref={dialogRef} onCancel={() => setOpen(false)} onClose={() => setOpen(false)} onClick={(event) => {
        if (event.target === event.currentTarget) {
          const bounds = event.currentTarget.getBoundingClientRect()
          if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) setOpen(false)
        }
      }}>
        <div className="mobile-menu-heading" ref={menuHeadingRef} tabIndex={-1}>
          <a className="brand" href="#home" aria-label={t.homeLabel} onClick={() => setOpen(false)}><span className="brand-name">STAR-FARM</span></a>
          <button className="mobile-menu-close" type="button" aria-label={t.closeMenu} onClick={() => setOpen(false)}><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><path d="m5 5 14 14M19 5 5 19" /></svg></button>
        </div>
        <HeaderNavigation language={language} page={page} mobile onNavigate={() => setOpen(false)} onTopicOpen={() => setOpen(true)} />
        <div className="mobile-menu-language"><p>{t.language}</p><LanguageSwitcher language={language} changeLanguage={changeLanguage} expanded /></div>
      </dialog>
    </>
  )
}

type HeaderProps = {
  language: Language
  page: Page
  changeLanguage: (language: Language) => void
}

function DesktopHeader({ language, page, changeLanguage }: HeaderProps) {
  const { hidden, showHeader } = useHeaderScroll()
  const t = translations[language]

  return (
    <header className={`site-header desktop-header${page === 'home' ? ' header-home' : ''}${hidden ? ' header-hidden' : ''}`} onFocusCapture={showHeader}>
      <div className="header-inner">
        <a className="brand" href="#home" aria-label={t.homeLabel}><span className="brand-name">STAR-FARM</span></a>
        <HeaderNavigation language={language} page={page} />
        <LanguageSwitcher language={language} changeLanguage={changeLanguage} />
      </div>
    </header>
  )
}

function MobileHeader(props: HeaderProps) {
  const [open, setOpen] = useState(false)
  const { hidden, showHeader } = useHeaderScroll(open)
  const t = translations[props.language]
  return (
    <header className={`site-header mobile-header${props.page === 'home' ? ' header-home' : ''}${hidden ? ' header-hidden' : ''}`} onFocusCapture={showHeader}>
      <div className="header-inner mobile-header-inner">
        <a className="brand" href="#home" aria-label={t.homeLabel}><span className="brand-name">STAR-FARM</span></a>
        <MobileMenu {...props} open={open} setOpen={setOpen} />
      </div>
    </header>
  )
}

export default function SiteHeader(props: HeaderProps) {
  const mobile = useSyncExternalStore(subscribeToViewport, getMobileSnapshot, () => false)
  return mobile ? <MobileHeader {...props} /> : <DesktopHeader {...props} />
}
