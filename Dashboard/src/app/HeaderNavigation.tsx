import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { translations } from '../i18n'
import type { Language } from '../i18n'
import type { Page } from './usePageNavigation'
import { navigationTopics as topics } from './navigationTopics'
import type { Topic } from './navigationTopics'
import { resourceDestination } from '../features/resources/resourceRoutes'
import { environmentDestination } from '../features/environment/environmentRoutes'
import '../styles/topic-navigation.css'

const branches = [
  { id: 'overview', label: 'menuOverview' },
  { id: 'comparison', label: 'menuComparison' },
  { id: 'bau', label: 'menuBau' },
] as const

type Branch = typeof branches[number]['id']

function leafDestination(topic: Topic, branch: Branch, index: number): { href: string; page: Page } | undefined {
  if (topic === 'sustainability') return environmentDestination(branch, index)
  if (topic === 'resources') return resourceDestination(branch, index)
  if (topic !== 'economics') return undefined
  if (branch === 'bau') {
    const destinations: { href: string; page: Page }[] = [
      { href: '#economics-bau3', page: 'bau3Farming' },
      { href: '#economics-bau2', page: 'bau2Farming' },
      { href: '#economics-bauss', page: 'baussFarming' },
    ]
    return destinations[index]
  }
  if (branch === 'overview') return index === 0 ? { href: '#economics-overview', page: 'economics' } : { href: '#economics-comparison', page: 'economicComparison' }
  if (branch === 'comparison') {
    const destinations: { href: string; page: Page }[] = [
      { href: '#economics-bau3-vs-1mha', page: 'bau3Comparison' },
      { href: '#economics-bau2-vs-1mha', page: 'bau2Comparison' },
      { href: '#economics-bauss-vs-1mha', page: 'baussComparison' },
    ]
    return destinations[index]
  }
}

export default function HeaderNavigation({ language, page, mobile = false, onNavigate, onTopicOpen }: {
  language: Language
  page: Page
  mobile?: boolean
  onNavigate?: () => void
  onTopicOpen?: () => void
}) {
  const t = translations[language]
  const [openTopic, setOpenTopic] = useState<Topic | null>(null)
  const [openBranch, setOpenBranch] = useState<Branch | null>(null)
  const navigationRef = useRef<HTMLElement>(null)
  const focusTimer = useRef<number | undefined>(undefined)

  function open(topic: Topic) {
    setOpenTopic(topic)
    setOpenBranch(null)
    onTopicOpen?.()
  }

  function close() {
    setOpenTopic(null)
    setOpenBranch(null)
  }

  function navigate() {
    close()
    onNavigate?.()
  }

  function focusFirst(id: string, last = false) {
    window.clearTimeout(focusTimer.current)
    focusTimer.current = window.setTimeout(() => {
      const buttons = document.getElementById(id)?.querySelectorAll<HTMLElement>('button, a[href]')
      if (buttons?.length) buttons[last ? buttons.length - 1 : 0].focus()
    }, 0)
  }

  useEffect(() => () => window.clearTimeout(focusTimer.current), [])

  useLayoutEffect(() => {
    if (mobile) return
    const header = navigationRef.current?.closest<HTMLElement>('.desktop-header')
    if (!header) return
    const panel = navigationRef.current?.querySelector<HTMLElement>(':scope > .topic-dropdown')
    if (!panel) {
      header.style.removeProperty('--submenu-height')
      return
    }
    const measure = () => {
      const panelBounds = panel.getBoundingClientRect()
      const flyoutBounds = panel.querySelector<HTMLElement>('.topic-flyout')?.getBoundingClientRect()
      const height = Math.max(panelBounds.height, flyoutBounds ? flyoutBounds.bottom - panelBounds.top + 8 : 0)
      if (height > 0) header.style.setProperty('--submenu-height', `${height}px`)
      const navigationBounds = navigationRef.current?.getBoundingClientRect()
      const triggerBounds = document.getElementById(`topic-${openTopic}-trigger`)?.getBoundingClientRect()
      if (panelBounds.width > 0 && navigationBounds && triggerBounds) {
        const inner = header.querySelector<HTMLElement>('.header-inner')
        const gutter = inner ? parseFloat(window.getComputedStyle(inner).paddingRight) || 16 : 16
        const left = Math.max(gutter, Math.min(triggerBounds.left, window.innerWidth - gutter - panelBounds.width))
        panel.style.left = `${left - navigationBounds.left}px`
        panel.style.right = 'auto'
      }
    }
    measure()
    const observer = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(measure)
    observer?.observe(panel)
    const flyout = panel.querySelector<HTMLElement>('.topic-flyout')
    if (flyout) observer?.observe(flyout)
    window.addEventListener('resize', measure)
    return () => {
      observer?.disconnect()
      window.removeEventListener('resize', measure)
      header.style.removeProperty('--submenu-height')
    }
  }, [mobile, openTopic, openBranch, language])

  useEffect(() => {
    if (!openTopic || mobile) return
    const outside = (event: Event) => {
      if (event.target instanceof Node && !navigationRef.current?.contains(event.target)) {
        setOpenTopic(null)
        setOpenBranch(null)
      }
    }
    window.addEventListener('pointerdown', outside)
    window.addEventListener('focusin', outside)
    return () => {
      window.removeEventListener('pointerdown', outside)
      window.removeEventListener('focusin', outside)
    }
  }, [openTopic, mobile])

  function handleKeys(event: KeyboardEvent<HTMLElement>) {
    const target = event.target as HTMLElement
    if (event.key === 'Escape' && openTopic) {
      event.preventDefault()
      event.stopPropagation()
      if (openBranch) {
        document.getElementById(`topic-${openTopic}-${openBranch}-trigger`)?.focus()
        setOpenBranch(null)
      } else {
        document.getElementById(`topic-${openTopic}-trigger`)?.focus()
        close()
      }
      return
    }
    if (event.key === 'ArrowLeft' && openTopic && openBranch) {
      event.preventDefault()
      document.getElementById(`topic-${openTopic}-${openBranch}-trigger`)?.focus()
      setOpenBranch(null)
      return
    }
    const branch = target.dataset.branch as Branch | undefined
    if (event.key === 'ArrowRight' && openTopic && branch) {
      event.preventDefault()
      setOpenBranch(branch)
      focusFirst(`topic-${openTopic}-${branch}-panel`)
      return
    }
    const list = target.closest('ul')
    if (!list || list.classList.contains('topic-list')) return
    if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
      event.preventDefault()
      const buttons = Array.from(list.children).map((item) => item.querySelector<HTMLElement>(':scope > button, :scope > a[href]')).filter((button): button is HTMLElement => button !== null)
      const current = buttons.indexOf(target)
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : (current + (event.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length
      buttons[next]?.focus()
    }
  }

  const children: Record<Branch, string[]> = {
    overview: [t.menuInformation, t.menuComparisonTable],
    comparison: ['BAU3S vs 1Mha', 'BAU2S vs 1Mha', 'BAUSS vs 1Mha'],
    bau: [t.menuThreeSeasons, t.menuTwoSeasons, t.menuSustainable],
  }

  function renderPanel(topic: typeof topics[number]) {
    const oneMha = {
      economics: { href: '#economics-1mha', page: 'oneMhaFarming' },
      resources: { href: '#resources-1mha', page: 'resourceOneMha' },
      sustainability: { href: '#environment-1mha', page: 'environmentOneMha' },
    }[topic.id]
    return (
      <div className={`topic-dropdown topic-dropdown-${topic.id}`} id={`topic-${topic.id}-panel`}>
        <ul className="topic-panel" aria-label={t[topic.label]}>
          {branches.map((branch) => (
            <li className="topic-branch" key={branch.id} onMouseEnter={mobile ? undefined : () => setOpenBranch(branch.id)}>
              <button className="topic-menu-button" type="button" id={`topic-${topic.id}-${branch.id}-trigger`} data-branch={branch.id} aria-expanded={openBranch === branch.id} aria-controls={`topic-${topic.id}-${branch.id}-panel`} onClick={() => setOpenBranch(mobile && openBranch === branch.id ? null : branch.id)}>
                {t[branch.label]}<span className="topic-chevron right" aria-hidden="true" />
              </button>
              {openBranch === branch.id && (
                <div className="topic-flyout" id={`topic-${topic.id}-${branch.id}-panel`}>
                  <ul className="topic-panel" aria-label={`${t[topic.label]} · ${t[branch.label]}`}>
                    {children[branch.id].map((label, index) => {
                      const destination = leafDestination(topic.id, branch.id, index)
                      return <li key={label}>{destination ? <a className="topic-menu-button topic-leaf" href={destination.href} aria-current={page === destination.page ? 'page' : undefined} onClick={navigate}>{label}</a> : <button className="topic-menu-button topic-leaf" type="button" aria-disabled="true">{label}</button>}</li>
                    })}
                  </ul>
                </div>
              )}
            </li>
          ))}
          <li onMouseEnter={mobile ? undefined : () => setOpenBranch(null)}><a className="topic-menu-button topic-leaf" href={oneMha.href} aria-current={page === oneMha.page ? 'page' : undefined} onClick={navigate}>{t.menuOneMha}</a></li>
        </ul>
      </div>
    )
  }

  const activeTopic = topics.find((topic) => topic.id === openTopic)
  const currentTopic: Topic | undefined = page.startsWith('environment') ? 'sustainability' : page.startsWith('resource') ? 'resources' : ['economics', 'economicExplore', 'economicComparison', 'bau3Comparison', 'bau2Comparison', 'baussComparison', 'bau3Farming', 'bau2Farming', 'baussFarming', 'oneMhaFarming'].includes(page) ? 'economics' : undefined

  return (
    <nav className={`top-navigation${mobile ? ' mobile-navigation' : ''}`} aria-label={t.mainNavigation} ref={navigationRef} onKeyDown={handleKeys} onMouseLeave={mobile ? undefined : close}>
      <ul className="topic-list" onScroll={mobile ? undefined : close}>
        <li className="header-page-item" onMouseEnter={mobile ? undefined : close}><a href="#home" aria-current={page === 'home' ? 'page' : undefined} onFocus={close} onClick={navigate}>{t.navHome}</a></li>
        <li className="header-page-item" onMouseEnter={mobile ? undefined : close}><a href="#glossary" aria-current={page === 'glossary' ? 'page' : undefined} onFocus={close} onClick={navigate}>{t.navGlossary}</a></li>
        <li className="header-page-item" onMouseEnter={mobile ? undefined : close}><a href="#future" aria-current={page === 'future' ? 'page' : undefined} onFocus={close} onClick={navigate}>{t.navFuture}</a></li>
        <li className="header-page-item" onMouseEnter={mobile ? undefined : close}><a href="#scenario-details" aria-current={page === 'scenario' ? 'page' : undefined} onFocus={close} onClick={navigate}>{t.navScenarioDetails}</a></li>
        {topics.map((topic) => (
          <li className="topic-item" key={topic.id} onMouseEnter={mobile ? undefined : () => open(topic.id)}>
            <button className="topic-trigger" id={`topic-${topic.id}-trigger`} type="button" aria-current={currentTopic === topic.id ? 'true' : undefined} aria-expanded={openTopic === topic.id} aria-controls={`topic-${topic.id}-panel`} onClick={() => mobile && openTopic === topic.id ? close() : open(topic.id)} onKeyDown={(event) => {
              if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
                event.preventDefault()
                event.stopPropagation()
                open(topic.id)
                focusFirst(`topic-${topic.id}-panel`, event.key === 'ArrowUp')
              }
            }}>
              <span className="topic-trigger-label">{t[topic.label]}<span className="topic-chevron down" aria-hidden="true" /></span>
            </button>
            {mobile && openTopic === topic.id && renderPanel(topic)}
          </li>
        ))}
      </ul>
      {!mobile && activeTopic && renderPanel(activeTopic)}
    </nav>
  )
}
