import type { Translation } from '../../i18n';
import type { Language } from '../../utils/language';

interface DashboardHeaderProps {
    t: Translation;
    language: Language;
    onLanguageChange: (language: Language) => void;
}

export function DashboardHeader({ t, language, onLanguageChange }: DashboardHeaderProps) {
    return (
        <header>
            <div className="header-title">
                <h1>{t.title}</h1>
                <p>{t.subtitle}</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div className="lang-toggle-container">
                    <button type="button" className={`lang-toggle-btn ${language === 'vi' ? 'active' : ''}`} onClick={() => onLanguageChange('vi')}>VI</button>
                    <button type="button" className={`lang-toggle-btn ${language === 'en' ? 'active' : ''}`} onClick={() => onLanguageChange('en')}>EN</button>
                </div>
            </div>
        </header>
    );
}
