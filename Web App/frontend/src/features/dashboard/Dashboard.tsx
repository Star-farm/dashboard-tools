import { useEffect, useState } from 'react';
import { useDashboardData } from '../../hooks/useDashboardData';
import { detectBrowserLang, type Language } from '../../utils/language';
import { DashboardFooter } from './DashboardFooter';
import { DashboardHeader } from './DashboardHeader';
import { KpiSection } from './KpiSection';
import { ScenarioCharts } from './ScenarioCharts';
import { SimulationControls } from './SimulationControls';
import { BackToTop } from './BackToTop';

export function Dashboard() {
    const [language, setLanguage] = useState<Language>(detectBrowserLang());
    const dashboard = useDashboardData(language);

    useEffect(() => { document.documentElement.lang = language; }, [language]);

    const charts = (
        <ScenarioCharts
            t={dashboard.t}
            economicChart={dashboard.economicChart}
            environmentChart={dashboard.environmentChart}
            loading={dashboard.loadingBar}
            isMobile={dashboard.isMobile}
            showVndNote={dashboard.isVndNetIncome}
        />
    );
    const controls = (
        <SimulationControls
            t={dashboard.t}
            language={language}
            scenarioGroup={dashboard.simScenarioGroup}
            setScenarioGroup={dashboard.setSimScenarioGroup}
            inputs={dashboard.simInputs}
            setInputs={dashboard.setSimInputs}
            results={dashboard.simResults}
            currentKpis={dashboard.kpiChange}
            loading={dashboard.loadingSim}
            runSimulation={dashboard.runSimulation}
        />
    );

    return (
        <div className="dashboard-container">
            <a className="skip-link" href="#main-content">{language === 'vi' ? 'Đến nội dung chính' : 'Skip to content'}</a>
            <DashboardHeader t={dashboard.t} language={language} onLanguageChange={setLanguage} />
            <main id="main-content" className="dashboard-main content-width" tabIndex={-1}>
                <section className="page-intro" id="overview" aria-labelledby="page-title">
                    <h1 id="page-title">{dashboard.t.title}</h1>
                    <p>{dashboard.t.subtitle}</p>
                </section>
                {dashboard.isInitialLoading ? (
                    <div className="initial-loading-screen" role="status">
                        <div className="initial-loading-spinner" aria-hidden="true" />
                        <p>{dashboard.t.initialLoadingMessage}</p>
                    </div>
                ) : (
                    <>
                        {dashboard.requestError && <p className="request-error" role="alert">{language === 'vi' ? 'Chưa thể tải đầy đủ dữ liệu mô phỏng. Vui lòng kiểm tra kết nối và thử lại.' : 'Some simulation data could not be loaded. Please check your connection and try again.'}</p>}
                        <KpiSection t={dashboard.t} language={language} cards={dashboard.KPI_CARDS} changes={dashboard.kpiChange} loading={dashboard.loadingKpi} />

                        {!dashboard.loadingKpi && dashboard.keyMessage && (
                            <section className="glass-panel key-message-panel">
                                <p>{dashboard.keyMessageParts?.length ? dashboard.keyMessageParts.map((part, index) => part.tone
                                    ? <strong key={index} className={part.tone}>{part.text}</strong>
                                    : part.text) : dashboard.keyMessage}</p>
                            </section>
                        )}

                        <h2 id="simulation" className="section-heading">{dashboard.t.simulationSectionTitle}</h2>
                        <div className="dashboard-grid">
                            {dashboard.isMobile ? <>{controls}{charts}</> : <>{charts}{controls}</>}
                        </div>
                        <section className="data-cta-panel">
                            <p className="data-cta-text">{dashboard.t.viewDetailedDataAt}</p>
                            <a className="btn data-cta-btn" href={language === 'vi' ? 'https://datastudio.google.com/s/iQluHi5iSE0' : 'https://datastudio.google.com/s/nC82cbYUx7Q'} target="_blank" rel="noopener noreferrer">
                                {dashboard.t.dataVisualizationLinkText}<span aria-hidden="true">{'>'}</span>
                            </a>
                        </section>
                    </>
                )}
            </main>
            <DashboardFooter t={dashboard.t} language={language} />
            <BackToTop language={language} />
        </div>
    );
}
