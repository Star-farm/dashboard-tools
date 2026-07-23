import type { Translation } from '../../i18n';

export function DashboardFooter({ t }: { t: Translation }) {
    return (
        <>
            <section className="glass-panel data-cta-panel">
                <p className="data-cta-text">{t.viewDetailedDataAt}</p>
                <a href="https://datastudio.google.com/s/nC82cbYUx7Q" target="_blank" rel="noopener noreferrer" className="btn data-cta-btn">
                    {t.dataVisualizationLinkText}
                </a>
            </section>
            <footer className="app-footer">
                <div className="footer-inner">
                    <div className="footer-about">
                        <h3 className="footer-project-name">{t.footerProjectName}</h3>
                        <p className="footer-tagline">{t.footerTagline}</p>
                        <p className="footer-description">{t.footerDescription}</p>
                        <p className="footer-partof">{t.footerPartOf}</p>
                    </div>
                    <div className="footer-links">
                        <h4>{t.footerLinks}</h4>
                        <ul>
                            <li><a href="https://datastudio.google.com/s/nC82cbYUx7Q" target="_blank" rel="noopener noreferrer">{t.footerDataVisualization}</a></li>
                            <li><a href="https://github.com/Star-farm/Star-farm-models" target="_blank" rel="noopener noreferrer">{t.footerDocumentation}</a></li>
                            <li><a href="https://across-lab.org/" target="_blank" rel="noopener noreferrer">{t.aboutus}</a></li>
                        </ul>
                    </div>
                </div>
                <div className="footer-bottom">
                    <span>© {new Date().getFullYear()} {t.footerProjectName} · {t.footerRights}</span>
                </div>
            </footer>
        </>
    );
}
