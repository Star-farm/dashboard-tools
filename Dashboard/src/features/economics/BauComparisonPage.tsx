import { useEffect } from 'react'
import type { Language } from '../../i18n'
import { getScrollBehavior } from '../../app/scrollBehavior'
import EmphasizedNumbers from '../../components/EmphasizedNumbers'
import ScenarioComparisonChart from '../../components/ScenarioComparisonChart'
import { bau3Metrics } from './bau3Types'
import type { Bau3Data } from './bau3Types'
import { analyzeBau3, bau3Domain, bau3Unit, formatBau3Value, selectBau3Points } from './bau3Analysis'
import { bau3Text } from './bau3Text'
import '../../styles/bau3-comparison.css'

export default function BauComparisonPage({ language, data }: { language: Language; data: Bau3Data }) {
  const t = bau3Text[language]
  const variant = data.variant ?? 'bau3s'
  const anchor = { bau3s: 'economics-bau3-vs-1mha', bau2s: 'economics-bau2-vs-1mha', bauss: 'economics-bauss-vs-1mha' }[variant]
  const title = { bau3s: t.title, bau2s: t.bau2Title, bauss: t.baussTitle }[variant]
  const currency = language === 'vi' ? 'VND' : 'USD'
  const baselineLabel = { bau3s: t.bau3Short, bau2s: t.bau2Short, bauss: t.baussShort }[variant]
  const compact = new Intl.NumberFormat(language, { notation: 'compact', maximumFractionDigits: 1 })
  useEffect(() => {
    document.getElementById(anchor)?.scrollIntoView?.({ block: 'start', behavior: getScrollBehavior() })
  }, [anchor])
  return (
    <div className="bau3-page page-shell" id={anchor}>
      <section className="intro bau3-intro" aria-labelledby="bau-comparison-title"><h1 id="bau-comparison-title">{title}</h1><span>{data.startYear}–{data.endYear}</span></section>
      <div className="bau3-sections">{bau3Metrics.map((metric) => {
        const domain = bau3Domain(data, metric, currency)
        const analysis = analyzeBau3(data, metric, language)
        return <section className="bau3-section" key={metric} aria-labelledby={`bau-${variant}-${metric}-title`}>
          <h2 id={`bau-${variant}-${metric}-title`}>{t[metric]}</h2>
          <ScenarioComparisonChart key={variant} language={language} title={t[metric]} baselineLabel={baselineLabel} baseline={selectBau3Points(data, variant, metric, currency)} oneMha={selectBau3Points(data, 'oneMha', metric, currency)} startYear={data.startYear} endYear={data.endYear} domain={domain} unit={bau3Unit(metric, language)} formatValue={(value) => formatBau3Value(value, metric, language)} formatAxis={(value) => `${compact.format(value)}${metric === 'margin' ? '%' : ''}`} />
          <aside className="bau3-insight" aria-label={`${t.insight} · ${t[metric]}`}><h3>{t.insight}</h3><p><EmphasizedNumbers text={analysis?.paragraph ?? t.noData} /></p></aside>
        </section>
      })}</div>
    </div>
  )
}
