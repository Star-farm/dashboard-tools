import { useState } from 'react';
import { useDashboardData } from '../../hooks/useDashboardData';
import { detectBrowserLang, type Language } from '../../utils/language';
import { DashboardFooter } from './DashboardFooter';
import { DashboardHeader } from './DashboardHeader';
import { KpiSection } from './KpiSection';
import { ScenarioCharts } from './ScenarioCharts';
import { SimulationControls } from './SimulationControls';

export function Dashboard() {
    const [language, setLanguage] = useState<Language>(detectBrowserLang());
    const dashboard = useDashboardData(language);

    if (dashboard.isInitialLoading) {
        return (
            <div className="initial-loading-screen">
                <div className="initial-loading-spinner" />
                <p>{dashboard.t.initialLoadingMessage}</p>
            </div>
        );
    }

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
            loading={dashboard.loadingSim}
            runSimulation={dashboard.runSimulation}
        />
    );

    return (
        <div className="dashboard-container">
            <DashboardHeader t={dashboard.t} language={language} onLanguageChange={setLanguage} />
            <KpiSection t={dashboard.t} language={language} cards={dashboard.KPI_CARDS} changes={dashboard.kpiChange} loading={dashboard.loadingKpi} />

            {!dashboard.loadingKpi && dashboard.keyMessage && (
                <section className="glass-panel key-message-panel">
                    <div style={{ display: 'flex', gap: dashboard.isMobile ? '0.6rem' : '1rem', alignItems: 'flex-start' }}>
                        <p style={{
                            color: '#ff0202ff',
                            fontSize: dashboard.isMobile ? '0.85rem' : '1.15rem',
                            lineHeight: dashboard.isMobile ? 1.5 : 1.7,
                            fontWeight: 500,
                            margin: 0,
                            wordBreak: 'break-word',
                        }}>
                            {dashboard.keyMessage}
                        </p>
                    </div>
                </section>
            )}

            <h2 style={{ marginBottom: '1rem' }}>{dashboard.t.simulationSectionTitle}</h2>
            <div className="dashboard-grid">
                {dashboard.isMobile ? <>{controls}{charts}</> : <>{charts}{controls}</>}
            </div>
            <DashboardFooter t={dashboard.t} />
        </div>
    );
}
