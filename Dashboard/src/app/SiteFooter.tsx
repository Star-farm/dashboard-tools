import { translations } from '../i18n'
import type { Language } from '../i18n'
import irdLogo from '../assets/partners/ird-optimized.webp'
import ciradLogo from '../assets/partners/cirad-optimized.webp'
import ctuLogo from '../assets/partners/ctu-optimized.webp'
import desiraLogo from '../assets/partners/desira-optimized.webp'
import euLogo from '../assets/partners/eu-global-gateway.svg'
import faoLogo from '../assets/partners/fao-blue-optimized.webp'
import ispaeLogo from '../assets/partners/ispae-optimized.webp'
import vaasLogo from '../assets/partners/vaas-optimized.webp'

const partners = [
  { name: 'CIRAD', className: 'cirad', label: 'CIRAD', href: 'https://www.cirad.fr/', logo: ciradLogo, width: 210, height: 111 },
  { name: 'CTU', className: 'ctu', label: 'Đại học Cần Thơ · Can Tho University', href: 'https://www.ctu.edu.vn/', logo: ctuLogo, width: 112, height: 112 },
  { name: 'IRD', className: 'ird', label: 'Institut de recherche pour le développement', href: 'https://www.ird.fr/', logo: irdLogo, width: 220, height: 103 },
  { name: 'ISPAE', className: 'ispae', label: 'ISPAE', href: 'https://ispae.vn/', logo: ispaeLogo, width: 240, height: 81 },
  { name: 'VAAS', className: 'vaas', label: 'Vietnam Academy of Agricultural Sciences', href: 'https://vaas.vn/', logo: vaasLogo, width: 114, height: 114 },
]

export default function SiteFooter({ language }: { language: Language }) {
  const t = translations[language]

  return (
    <footer className="site-footer">
      <div className="footer-main">
        <div className="footer-content content-width">
          <div className="footer-about">
            <div className="brand footer-brand"><span className="brand-name">STAR-FARM</span><span className="brand-full-name"><em>{t.footerProjectTitle}</em></span></div>
            <div className="footer-links"><h2>{t.footerResources}</h2><a href="https://across-lab.org/application/star-farm/" target="_blank" rel="noopener noreferrer">{t.footerProject}<span aria-hidden="true">{'>'}</span></a><a href="https://across-lab.org/" target="_blank" rel="noopener noreferrer">{t.footerResearch}<span aria-hidden="true">{'>'}</span></a></div>
          </div>
          <section className="partners-section" id="partners" aria-label={t.partners}>
            <div className="partners-inner">
              <div className="project-role-row">
                <section className="project-funders" aria-labelledby="funders-title">
                  <h2 id="funders-title">{language === 'vi' ? 'Đơn vị tài trợ' : 'Funded by'}</h2>
                  <div className="funder-logos">
                    <a className="partner-link funding-eu" href="https://international-partnerships.ec.europa.eu/policies/global-gateway_en" target="_blank" rel="noopener noreferrer" aria-label="European Union · Global Gateway"><img src={euLogo} alt="European Union · Global Gateway" width="742" height="338" loading="lazy" decoding="async" /></a>
                    <a className="partner-link funding-desira" href="https://capacity4dev.europa.eu/projects/desira_en" target="_blank" rel="noopener noreferrer" aria-label="DeSIRA"><img src={desiraLogo} alt="DeSIRA — Partnerships for Innovation" width="264" height="75" loading="lazy" decoding="async" /></a>
                  </div>
                </section>
                <section className="project-coordinator" aria-labelledby="coordinator-title">
                  <h2 id="coordinator-title">{language === 'vi' ? 'Điều phối dự án' : 'Project coordinator'}</h2>
                  <a className="partner-link partner-fao" href="https://www.fao.org/" target="_blank" rel="noopener noreferrer" aria-label="Food and Agriculture Organization of the United Nations"><img className="partner-image" src={faoLogo} alt="FAO" width="116" height="118" loading="lazy" decoding="async" /></a>
                </section>
              </div>
              <h2 className="project-partners-title">{language === 'vi' ? 'Đối tác dự án' : 'Project partners'}</h2>
              <ul className="partner-list">
                {partners.map((partner) => (
                  <li className={`partner-item partner-${partner.className}`} key={partner.name}>
                    <a className="partner-link" href={partner.href} target="_blank" rel="noopener noreferrer" aria-label={partner.label}>
                      <img className="partner-image" src={partner.logo} alt={partner.label} width={partner.width} height={partner.height} loading="lazy" decoding="async" />
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
