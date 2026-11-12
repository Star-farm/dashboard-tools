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
            <a className="hero-primary" href="#home-about" ref={exploreRef}>{t.heroExplore}<span aria-hidden="true">{'>'}</span></a>
          </div>
        </div>
      </section>

      <section className="home-about content-width" id="home-about" aria-labelledby="home-about-title">
        <p className="eyebrow">STAR-FARM</p>
        <h2 id="home-about-title">{language === 'vi' ? 'Về dự án' : 'About the project'}</h2>
        <p>{language === 'vi'
          ? 'STAR-FARM là dự án do Liên minh châu Âu (EU) tài trợ với kinh phí 4,15 triệu euro, do Tổ chức Lương thực và Nông nghiệp Liên Hợp Quốc (FAO) triển khai trong giai đoạn 2023–2027. Dự án thúc đẩy chuyển đổi nông nghiệp sinh thái thông minh tại Đồng bằng sông Cửu Long, tăng khả năng chống chịu trước biến đổi khí hậu, suy thoái môi trường và các cú sốc từ bên ngoài.'
          : 'STAR-FARM is funded by the European Union (EU) with a contribution of €4.15 million and implemented by the Food and Agriculture Organization of the United Nations (FAO) from 2023 to 2027. The project supports smart agroecological transformation in the Mekong Delta and strengthens resilience to climate change, environmental degradation and other external shocks.'}</p>
        <p>{language === 'vi'
          ? 'Dự án hướng đến xây dựng chính sách và cơ chế hỗ trợ, củng cố chuỗi giá trị nông nghiệp sinh thái, nâng cao năng lực của các tổ chức nông dân, hợp tác xã và doanh nghiệp nông nghiệp, đồng thời tăng cường học hỏi và tư vấn thích ứng. Trang thông tin này giúp khám phá các kịch bản canh tác lúa ở Đồng Tháp đến năm 2050 qua bản đồ và các chỉ số kinh tế, tài nguyên và môi trường.'
          : 'The project aims to strengthen supportive policies and frameworks, consolidate agroecological value chains, build the capacity of farmer organizations, cooperatives and agricultural enterprises, and improve adaptive learning and advisory systems. This dashboard explores rice farming scenarios in Dong Thap through 2050 using maps and economic, resource and environmental indicators.'}</p>
        <p><a href="https://www.eeas.europa.eu/projects-star-farm_en" target="_blank" rel="noreferrer">{language === 'vi' ? 'Tìm hiểu thêm về dự án trên trang EU' : 'Read more about the project on the EU website'}</a></p>
      </section>

      <section className="home-explore content-width" id="home-explore" aria-label={t.homeExplore}>
        <aside className="glossary-callout" aria-labelledby="future-callout-title">
          <div><p className="eyebrow">{t.futureCtaEyebrow}</p><h2 id="future-callout-title">{t.navFuture}</h2><p>{t.futureCtaDescription}</p></div>
          <a href="#future">{t.navFuture}<span aria-hidden="true">{'>'}</span></a>
        </aside>
        <aside className="glossary-callout" aria-labelledby="scenario-callout-title">
          <div><p className="eyebrow">{t.scenarioCtaEyebrow}</p><h2 id="scenario-callout-title">{t.navScenarioDetails}</h2><p>{t.scenarioCtaDescription}</p></div>
          <a href="#scenario-details">{t.navScenarioDetails}<span aria-hidden="true">{'>'}</span></a>
        </aside>
        <aside className="glossary-callout" aria-labelledby="map-callout-title">
          <div><p className="eyebrow">{t.mapCtaEyebrow} </p><h2 id="map-callout-title">{t.navMap}</h2><p>{t.mapCtaDescription}</p></div>
          <a href="#map">{t.navMap}<span aria-hidden="true">{'>'}</span></a>
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
