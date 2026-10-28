import type { Translation } from '../../i18n';
import type { Language } from '../../utils/language';
import { useHeaderScroll } from '../../hooks/useHeaderScroll';
import '../../styles/site-shell.css';

interface DashboardHeaderProps {
    t: Translation;
    language: Language;
    onLanguageChange: (language: Language) => void;
}

export function DashboardHeader({ t, language, onLanguageChange }: DashboardHeaderProps) {
    const { hidden, showHeader } = useHeaderScroll();

    return (
        <header className={`site-header${hidden ? ' header-hidden' : ''}`} onFocusCapture={showHeader}>
            <div className="header-inner">
                <a className="brand-name" href="#overview" aria-label={t.footerProjectName}>STAR-FARM</a>
                <div className="lang-toggle-container" role="group" aria-label={language === 'vi' ? 'Ngôn ngữ' : 'Language'}>
                    <button type="button" lang="vi" aria-label="Tiếng Việt" aria-pressed={language === 'vi'} className={`lang-toggle-btn ${language === 'vi' ? 'active' : ''}`} onClick={() => onLanguageChange('vi')}>VI</button>
                    <span aria-hidden="true">|</span>
                    <button type="button" lang="en" aria-label="English" aria-pressed={language === 'en'} className={`lang-toggle-btn ${language === 'en' ? 'active' : ''}`} onClick={() => onLanguageChange('en')}>EN</button>
                </div>
            </div>
        </header>
    );
}
