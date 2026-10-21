import { useEffect, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { translations } from '../i18n'
import type { Language } from '../i18n'
import type { Page } from './usePageNavigation'
import { navigationTopics as topics } from './navigationTopics'
import type { Topic } from './navigationTopics'
import '../styles/topic-navigation.css'

const branches = [
  { id: 'overview', label: 'menuOverview' },
  { id: 'comparison', label: 'menuComparison' },
  { id: 'bau', label: 'menuBau' },
] as const

type Branch = typeof branches[number]['id']

export default function HeaderNavigation({ language, page }: { language: Language; page: Page }) {
  const t = translations[language]
  const [openTopic, setOpenTopic] = useState<Topic | null>(null)
  const [openBranch, setOpenBranch] = useState<Branch | null>(null)
  const navigationRef = useRef<HTMLElement>(null)
  const focusTimer = useRef<number | undefined>(undefined)

  function open(topic: Topic) {
    setOpenTopic(topic)
    setOpenBranch(null)
  }

  function close() {
    setOpenTopic(null)
    setOpenBranch(null)
  }

  function focusFirst(id: string, last = false) {
    window.clearTimeout(focusTimer.current)
    focusTimer.current = window.setTimeout(() => {
      const buttons = document.getElementById(id)?.querySelectorAll<HTMLButtonElement>('button')
      if (buttons?.length) buttons[last ? buttons.length - 1 : 0].focus()
    }, 0)
  }

  useEffect(() => () => window.clearTimeout(focusTimer.current), [])

  useEffect(() => {
    if (!openTopic) return
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
  }, [openTopic])

  function handleKeys(event: KeyboardEvent<HTMLElement>) {
    const target = event.target as HTMLElement
    if (event.key === 'Escape' && openTopic) {
      event.preventDefault()
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
      const buttons = Array.from(list.children).map((item) => item.querySelector<HTMLButtonElement>(':scope > button')).filter((button): button is HTMLButtonElement => button !== null)
      const current = buttons.indexOf(target as HTMLButtonElement)
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : (current + (event.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length
      buttons[next]?.focus()
    }
  }

  const children: Record<Branch, string[]> = {
    overview: [t.menuInformation, t.menuComparisonTable],
    comparison: ['BAU3S vs 1Mha', 'BAU2S vs 1Mha', 'BAUSS vs 1Mha'],
    bau: [t.menuThreeSeasons, t.menuTwoSeasons, t.menuSustainable],
  }

  const activeTopic = topics.find((topic) => topic.id === openTopic)

  return (
    <nav className="top-navigation" aria-label={t.mainNavigation} ref={navigationRef} onKeyDown={handleKeys} onMouseLeave={close}>
      <ul className="topic-list" onScroll={close}>
        <li className="header-page-item" onMouseEnter={close}><a href="#home" aria-current={page === 'home' ? 'page' : undefined} onFocus={close} onClick={close}>{t.navHome}</a></li>
        <li className="header-page-item" onMouseEnter={close}><a href="#glossary" aria-current={page === 'glossary' ? 'page' : undefined} onFocus={close} onClick={close}>{t.navGlossary}</a></li>
        <li className="header-page-item" onMouseEnter={close}><a href="#future" aria-current={page === 'future' ? 'page' : undefined} onFocus={close} onClick={close}>{t.navFuture}</a></li>
        <li className="header-page-item" onMouseEnter={close}><a href="#scenario-details" aria-current={page === 'scenario' ? 'page' : undefined} onFocus={close} onClick={close}>{t.navScenarioDetails}</a></li>
        {topics.map((topic) => (
          <li className="topic-item" key={topic.id} onMouseEnter={() => open(topic.id)}>
            <button className="topic-trigger" id={`topic-${topic.id}-trigger`} type="button" aria-expanded={openTopic === topic.id} aria-controls={`topic-${topic.id}-panel`} onClick={() => open(topic.id)} onKeyDown={(event) => {
              if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
                event.preventDefault()
                event.stopPropagation()
                open(topic.id)
                focusFirst(`topic-${topic.id}-panel`, event.key === 'ArrowUp')
              }
            }}>
              <span className="topic-trigger-label">{t[topic.label]}<span className="topic-chevron down" aria-hidden="true" /></span>
            </button>
          </li>
        ))}
      </ul>
      {activeTopic && (
        <div className={`topic-dropdown topic-dropdown-${activeTopic.id}`} id={`topic-${activeTopic.id}-panel`}>
          <ul className="topic-panel" aria-label={t[activeTopic.label]}>
            {branches.map((branch) => (
              <li className="topic-branch" key={branch.id} onMouseEnter={() => setOpenBranch(branch.id)}>
                <button className="topic-menu-button" type="button" id={`topic-${activeTopic.id}-${branch.id}-trigger`} data-branch={branch.id} aria-expanded={openBranch === branch.id} aria-controls={`topic-${activeTopic.id}-${branch.id}-panel`} onClick={() => setOpenBranch(branch.id)}>
                  {t[branch.label]}<span className="topic-chevron right" aria-hidden="true" />
                </button>
                {openBranch === branch.id && (
                  <div className="topic-flyout" id={`topic-${activeTopic.id}-${branch.id}-panel`}>
                    <ul className="topic-panel" aria-label={`${t[activeTopic.label]} · ${t[branch.label]}`}>
                      {children[branch.id].map((label) => <li key={label}><button className="topic-menu-button topic-leaf" type="button" aria-disabled="true">{label}</button></li>)}
                    </ul>
                  </div>
                )}
              </li>
            ))}
            <li onMouseEnter={() => setOpenBranch(null)}><button className="topic-menu-button topic-leaf" type="button" aria-disabled="true">{t.menuOneMha}</button></li>
          </ul>
        </div>
      )}
    </nav>
  )
}
