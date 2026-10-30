import { useEffect, useRef } from 'react'
import landscape1280 from '../../assets/hero/landscape-1280.webp'
import landscape1920 from '../../assets/hero/landscape-1920.webp'
import landscape2560 from '../../assets/hero/landscape-2560.webp'
import mobile640 from '../../assets/hero/mobile-640.webp'
import mobile960 from '../../assets/hero/mobile-960.webp'
import mobile1280 from '../../assets/hero/mobile-1280.webp'
import { translations } from '../../i18n'
import type { Language } from '../../i18n'
import { navigationTopics } from '../../app/navigationTopics'

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

  return (
    <>
      <section className="home-hero" id="home" aria-labelledby="home-title">
        <picture className="hero-picture">
          <source media="(max-width: 600px)" srcSet={`${mobile640} 640w, ${mobile960} 960w, ${mobile1280} 1280w`} sizes="max(630px, calc(100svh - 120px))" />
          <img className="hero-art" src={landscape1920} srcSet={`${landscape1280} 1280w, ${landscape1920} 1920w, ${landscape2560} 2560w`} sizes="(max-width: 900px) 1230px, (max-width: 1800px) 1800px, 100vw" alt="" fetchPriority="high" width="4765" height="2480" />
        </picture>
        <div className="hero-shade" />
        <div className="hero-content">
          <h1 id="home-title">{t.heroTitle}{' '}<br /><span>{t.heroHighlight}</span></h1>
          <p className="hero-description">{t.heroDescription}</p>
          <p className="hero-project">{t.heroProject}</p>
          <div className="hero-actions">
            <a className="hero-primary" href="#home-explore" ref={exploreRef}>{t.heroExplore}<span aria-hidden="true">{'>'}</span></a>
          </div>
        </div>
      </section>

      <section className="home-explore content-width" id="home-explore" aria-label={t.homeExplore}>
        <aside className="glossary-callout" aria-labelledby="glossary-callout-title">
          <div><p className="eyebrow">{t.glossaryCtaEyebrow}</p><h2 id="glossary-callout-title">{t.glossaryCtaTitle}</h2><p>{t.glossaryCtaDescription}</p></div>
          <a href="#glossary">{t.heroGlossary}<span aria-hidden="true">{'>'}</span></a>
        </aside>
        <aside className="glossary-callout" aria-labelledby="future-callout-title">
          <div><p className="eyebrow">{t.futureCtaEyebrow}</p><h2 id="future-callout-title">{t.navFuture}</h2><p>{t.futureCtaDescription}</p></div>
          <a href="#future">{t.navFuture}<span aria-hidden="true">{'>'}</span></a>
        </aside>
        <aside className="glossary-callout" aria-labelledby="scenario-callout-title">
          <div><p className="eyebrow">{t.scenarioCtaEyebrow}</p><h2 id="scenario-callout-title">{t.navScenarioDetails}</h2><p>{t.scenarioCtaDescription}</p></div>
          <a href="#scenario-details">{t.navScenarioDetails}<span aria-hidden="true">{'>'}</span></a>
        </aside>
        {navigationTopics.map((topic) => (
          <aside className="glossary-callout" key={topic.id} aria-labelledby={`${topic.id}-callout-title`}>
            <div><p className="eyebrow">{t.topicsCtaEyebrow}</p><h2 id={`${topic.id}-callout-title`}>{t[topic.label]}</h2><p>{t[topic.description]}</p></div>
            {topic.id === 'economics' ? <a href="#economics-explore">{t.economicExploreTitle}<span aria-hidden="true">{'>'}</span></a>
              : topic.id === 'resources' ? <a href="#resources-explore">{t.resourceExploreTitle}<span aria-hidden="true">{'>'}</span></a>
              : <a href="#environment-explore">{t.environmentExploreTitle}<span aria-hidden="true">{'>'}</span></a>}
          </aside>
        ))}
      </section>
    </>
  )
}
