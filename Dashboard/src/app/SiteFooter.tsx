import { translations } from '../i18n'
import type { Language } from '../i18n'
import irdLogo from '../assets/partners/ird.png'
import ciradLogo from '../assets/partners/cirad.png'
import ctuLogo from '../assets/partners/ctu.png'
import desiraLogo from '../assets/partners/desira.png'
import euLogo from '../assets/partners/eu.png'
import faoLogo from '../assets/partners/fao-blue.png'

const partners = [
  { name: 'IRD', className: 'ird', label: 'Institut de recherche pour le développement', href: 'https://www.ird.fr/', logo: irdLogo, width: 640, height: 300 },
  { name: 'CIRAD', className: 'cirad', label: 'CIRAD', href: 'https://www.cirad.fr/', logo: ciradLogo, width: 290, height: 198 },
  { name: 'CTU', className: 'ctu', label: 'Đại học Cần Thơ · Can Tho University', href: 'https://www.ctu.edu.vn/', logo: ctuLogo, width: 320, height: 320 },
  { name: 'DeSIRA', className: 'desira', label: 'DeSIRA — Partnerships for Innovation · European Union', href: 'https://capacity4dev.europa.eu/projects/desira_en', logo: desiraLogo, width: 362, height: 103 },
  { name: 'FAO', className: 'fao', label: 'Food and Agriculture Organization of the United Nations', href: 'https://www.fao.org/', logo: faoLogo, width: 250, height: 255 },
]

export default function SiteFooter({ language }: { language: Language }) {
  const t = translations[language]

  return (
    <footer className="site-footer">
      <div className="footer-main">
        <div className="footer-content content-width">
          <div className="footer-about">
            <div className="brand footer-brand"><span className="brand-name">STAR-FARM</span><span className="brand-full-name"><em>{t.footerProjectTitle}</em></span></div>
            <div className="footer-links"><h2>{t.footerResources}</h2><a href="https://across-lab.org/application/star-farm/" target="_blank" rel="noopener noreferrer">{t.footerProject}<span aria-hidden="true">↗</span></a><a href="https://across-lab.org/" target="_blank" rel="noopener noreferrer">{t.footerResearch}<span aria-hidden="true">↗</span></a></div>
          </div>
          <section className="partners-section" id="partners" aria-label={t.partners}>
            <div className="partners-inner">
              <p>{t.partners}</p>
              <ul className="partner-list">
                {partners.map((partner) => (
                  <li className={`partner-item partner-${partner.className}`} key={partner.name}>
                    <a className="partner-link" href={partner.href} target="_blank" rel="noopener noreferrer" aria-label={partner.label}>
                      <img className="partner-image" src={partner.logo} alt={partner.name === 'DeSIRA' ? 'DeSIRA — Partnerships for Innovation' : partner.label} width={partner.width} height={partner.height} loading="lazy" decoding="async" />
                      {partner.name === 'DeSIRA' && <img className="eu-emblem" src={euLogo} alt="European Union" width="250" height="167" loading="lazy" decoding="async" />}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        </div>
        <div className="footer-bottom content-width"><span>{t.footerCopyright}</span></div>
      </div>
    </footer>
  )
}
