import { useEffect } from 'react'
import type { Language } from '../../i18n'
import { getScrollBehavior } from '../../app/scrollBehavior'
import EmphasizedNumbers from '../../components/EmphasizedNumbers'
import { bau3Text } from './bau3Text'
import type { Bau3Data, Bau3Family, Bau3Metric } from './bau3Types'
import { bau3Domain, bau3Unit, formatBau3Value } from './bau3Analysis'
import { analyzeBauFarming, bauFarmingStats, bauFarmingSummary, farmingTone } from './bauFarmingAnalysis'
import { bauFarmingText } from './bauFarmingText'
import Bau3LineChart from './Bau3LineChart'
import '../../styles/scenarios.css'
import '../../styles/bau3-comparison.css'
import '../../styles/bau-farming.css'

const metrics: Bau3Metric[] = ['income', 'cost', 'yield', 'margin', 'labor']

export default function FarmingPage({ language, data, family }: { language: Language; data: Bau3Data; family: Bau3Family }) {
  const t = bauFarmingText[language]
  const farming: Bau3Data = { ...data, series: data.series.filter((series) => series.family === family) }
  const anchor = { bau3s: 'economics-bau3', bau2s: 'economics-bau2', bauss: 'economics-bauss', oneMha: 'economics-1mha' }[family]
  const title = { bau3s: t.title, bau2s: t.bau2Title, bauss: t.baussTitle, oneMha: t.oneMhaTitle }[family]
  const labels = bau3Text[language]
  const currency = language === 'vi' ? 'VND' : 'USD'
  const number = new Intl.NumberFormat(language, { maximumFractionDigits: 1 })
  useEffect(() => {
    document.getElementById(anchor)?.scrollIntoView?.({ block: 'start', behavior: getScrollBehavior() })
  }, [anchor])

  return (
    <div className="bau-farming-page bau3-page page-shell" id={anchor}>
      <section className="intro bau3-intro" aria-labelledby="bau-farming-title"><h1 id="bau-farming-title">{title}</h1><span>{farming.startYear}–{farming.endYear}</span></section>
      <section className="farming-indicators" aria-labelledby="farming-kpis-title">
        <div className="farming-section-heading"><h2 id="farming-kpis-title">{t.kpis}</h2><p>{t.average} {farming.startYear}–{farming.endYear}</p></div>
        <dl className="scenario-kpis farming-kpis">{metrics.map((metric) => {
          const stats = bauFarmingStats(farming, metric, currency, family)
          const change = stats.change
          return <div className="scenario-kpi" key={metric}>
            <dt>{labels[metric]}</dt>
            <dd className="scenario-kpi-value"><strong>{stats.mean === null ? '—' : formatBau3Value(stats.mean, metric, language)}</strong><span>{bau3Unit(metric, language)}</span></dd>
            <dd className="scenario-kpi-change">{change === null ? <span>{t.unavailable}</span> : <><span className={`scenario-change ${farmingTone(stats)}`}><span aria-hidden="true">{Math.abs(change) < .000001 ? '−' : change > 0 ? '↑' : '↓'}</span> {number.format(Math.abs(change))}{metric === 'margin' ? ` ${t.points}` : '%'}</span><span>{t.change}</span></>}</dd>
          </div>
        })}</dl>
        <p className="farming-method">{t.method}</p>
      </section>
      <aside className="bau3-insight farming-summary" aria-labelledby="farming-summary-title"><h2 id="farming-summary-title">{t.summary}</h2><p><EmphasizedNumbers text={bauFarmingSummary(farming, language, family)} /></p></aside>
      <section className="farming-trends" aria-labelledby="farming-trends-title">
        <h2 id="farming-trends-title">{t.charts}</h2>
        <div className="farming-chart-grid">{metrics.map((metric) => {
          const analysis = analyzeBauFarming(farming, metric, language, family)
          return <section className="farming-chart-section" key={metric} aria-labelledby={`bau3-${metric}-${family}-title`}>
            <Bau3LineChart data={farming} family={family} metric={metric} domain={bau3Domain(farming, metric, currency)} language={language} title={labels[metric]} />
            <aside className="bau3-insight farming-chart-insight" aria-label={`${t.insight} · ${labels[metric]}`}><h4>{t.insight}</h4><p><EmphasizedNumbers text={analysis?.paragraph ?? t.unavailable} /></p></aside>
          </section>
        })}</div>
      </section>
    </div>
  )
}
