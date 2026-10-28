import type { Translation } from '../../i18n';
import type { Language } from '../../utils/language';
import irdLogo from '../../assets/partners/ird.png';
import ciradLogo from '../../assets/partners/cirad.png';
import ctuLogo from '../../assets/partners/ctu.png';
import desiraLogo from '../../assets/partners/desira.png';
import euLogo from '../../assets/partners/eu.png';
import faoLogo from '../../assets/partners/fao-blue.png';

type DashboardFooterProps = {
    t: Translation;
    language: Language;
};

const DATA_STUDIO_LINKS: Record<Language, string> = {
    vi: 'https://datastudio.google.com/s/iQluHi5iSE0',
    en: 'https://datastudio.google.com/s/nC82cbYUx7Q',
};

const partners = [
    { name: 'IRD', logo: irdLogo, href: 'https://www.ird.fr/', className: 'ird' },
    { name: 'CIRAD', logo: ciradLogo, href: 'https://www.cirad.fr/', className: 'cirad' },
    { name: 'Can Tho University', logo: ctuLogo, href: 'https://www.ctu.edu.vn/', className: 'ctu' },
    { name: 'DeSIRA', logo: desiraLogo, href: 'https://capacity4dev.europa.eu/projects/desira_en', className: 'desira' },
    { name: 'FAO', logo: faoLogo, href: 'https://www.fao.org/', className: 'fao' },
];

export function DashboardFooter({ t, language }: DashboardFooterProps) {
    const dataStudioLink = DATA_STUDIO_LINKS[language];

    return (
        <footer className="app-footer">
            <div className="footer-inner content-width" id="resources">
                <div className="footer-about">
                    <h3 className="footer-project-name">{t.footerProjectName}</h3>
                    <p className="footer-tagline">{t.footerTagline}</p>
                    <div className="footer-links">
                        <h4>{t.footerLinks}</h4>
                        <ul>
                            <li><a href={dataStudioLink} target="_blank" rel="noopener noreferrer">{t.footerDataVisualization}</a></li>
                            <li><a href="https://github.com/Star-farm/Star-farm-models" target="_blank" rel="noopener noreferrer">{t.footerDocumentation}</a></li>
                            <li><a href="https://across-lab.org/" target="_blank" rel="noopener noreferrer">{t.aboutus}</a></li>
                        </ul>
                    </div>
                </div>
                <ul className="partner-list" aria-label={language === 'vi' ? 'Đối tác dự án' : 'Project partners'}>
                    {partners.map(partner => (
                        <li key={partner.name}>
                            <a className="partner-link" href={partner.href} target="_blank" rel="noopener noreferrer" aria-label={partner.name}>
                                <img src={partner.logo} className={`partner-${partner.className}`} alt={partner.name} loading="lazy" />
                                {partner.className === 'desira' && <img src={euLogo} className="eu-emblem" alt="European Union" loading="lazy" />}
                            </a>
                        </li>
                    ))}
                </ul>
            </div>
            <div className="footer-bottom content-width">
                <span>© {new Date().getFullYear()} {t.footerProjectName} · {t.footerRights}</span>
            </div>
        </footer>
    );
}
