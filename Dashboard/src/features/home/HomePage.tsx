import { useEffect, useRef } from 'react'
import landscape from '../../assets/mekong-landscape.jpg'
import { translations } from '../../i18n'
import type { Language } from '../../i18n'
import { navigationTopics } from '../../app/navigationTopics'
import type { Topic } from '../../app/navigationTopics'
import { getScrollBehavior } from '../../app/scrollBehavior'

export default function HomePage({ language }: { language: Language }) {
  const t = translations[language]
  const exploreRef = useRef<HTMLAnchorElement>(null)

  useEffect(() => {
    if (!window.matchMedia?.('(max-width: 767px)').matches) return
    const clearRestoredFocus = () => {
      if (document.activeElement === exploreRef.current) exploreRef.current?.blur()
    }
    clearRestoredFocus()
    const frame = window.requestAnimationFrame?.(clearRestoredFocus)
    window.addEventListener('pageshow', clearRestoredFocus)
    return () => {
      if (frame !== undefined) window.cancelAnimationFrame(frame)
      window.removeEventListener('pageshow', clearRestoredFocus)
    }
  }, [])

  function openTopicMenu(topic: Topic) {
    const trigger = document.getElementById(`topic-${topic}-trigger`)
    trigger?.scrollIntoView?.({ block: 'nearest', inline: 'center', behavior: getScrollBehavior() })
    trigger?.focus({ preventScroll: true })
    trigger?.click()
  }

  return (
    <>
      <section className="home-hero" id="home" aria-labelledby="home-title">
        <img className="hero-art" src={landscape} alt="" fetchPriority="high" width="4765" height="2480" />
        <div className="hero-shade" />
        <div className="hero-content">
          <h1 id="home-title">{t.heroTitle}<br /><span>{t.heroHighlight}</span></h1>
          <p className="hero-description">{t.heroDescription}</p>
          <p className="hero-project">{t.heroProject}</p>
          <div className="hero-actions">
            <a className="hero-primary" href="#home-explore" ref={exploreRef}>{t.heroExplore}<span aria-hidden="true">↓</span></a>
          </div>
        </div>
        <div className="hero-bottom"><span>{t.heroFootnote}</span><a href="#home-explore">{t.scrollExplore}<span aria-hidden="true">↓</span></a></div>
      </section>

      <section className="home-explore content-width" id="home-explore" aria-label={t.homeExplore}>
        <aside className="glossary-callout" aria-labelledby="glossary-callout-title">
          <div><p className="eyebrow">{t.glossaryCtaEyebrow}</p><h2 id="glossary-callout-title">{t.glossaryCtaTitle}</h2><p>{t.glossaryCtaDescription}</p></div>
          <a href="#glossary">{t.heroGlossary}<span aria-hidden="true">→</span></a>
        </aside>
        <aside className="glossary-callout" aria-labelledby="future-callout-title">
          <div><p className="eyebrow">{t.futureCtaEyebrow}</p><h2 id="future-callout-title">{t.navFuture}</h2><p>{t.futureCtaDescription}</p></div>
          <a href="#future">{t.navFuture}<span aria-hidden="true">→</span></a>
        </aside>
        <aside className="glossary-callout" aria-labelledby="scenario-callout-title">
          <div><p className="eyebrow">{t.scenarioCtaEyebrow}</p><h2 id="scenario-callout-title">{t.navScenarioDetails}</h2><p>{t.scenarioCtaDescription}</p></div>
          <a href="#scenario-details">{t.navScenarioDetails}<span aria-hidden="true">→</span></a>
        </aside>
        {navigationTopics.map((topic) => (
          <aside className="glossary-callout" key={topic.id} aria-labelledby={`${topic.id}-callout-title`}>
            <div><p className="eyebrow">{t.topicsCtaEyebrow}</p><h2 id={`${topic.id}-callout-title`}>{t[topic.label]}</h2><p>{t[topic.description]}</p></div>
            <button type="button" aria-label={`${t.openTopicMenu}: ${t[topic.label]}`} aria-controls={`topic-${topic.id}-panel`} onClick={() => openTopicMenu(topic.id)}>{t.openTopicMenu}<span aria-hidden="true">→</span></button>
          </aside>
        ))}
      </section>
    </>
  )
}
