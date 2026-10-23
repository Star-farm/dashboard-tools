import { useEffect } from 'react'
import type { Language } from '../../i18n'
import { getScrollBehavior } from '../../app/scrollBehavior'
import EmphasizedNumbers from '../../components/EmphasizedNumbers'
import { bau3Metrics } from './bau3Types'
import type { Bau3Data, Bau3Family } from './bau3Types'
import { analyzeBau3, bau3Domain } from './bau3Analysis'
import { bau3Text } from './bau3Text'
import Bau3LineChart from './Bau3LineChart'
import '../../styles/bau3-comparison.css'

export default function BauComparisonPage({ language, data }: { language: Language; data: Bau3Data }) {
  const t = bau3Text[language]
  const variant = data.variant ?? 'bau3s'
  const anchor = { bau3s: 'economics-bau3-vs-1mha', bau2s: 'economics-bau2-vs-1mha', bauss: 'economics-bauss-vs-1mha' }[variant]
  const title = { bau3s: t.title, bau2s: t.bau2Title, bauss: t.baussTitle }[variant]
  const currency = language === 'vi' ? 'VND' : 'USD'
  const families: Bau3Family[] = [variant, 'oneMha']
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
          <div className="bau3-chart-pair">{families.map((family) => <Bau3LineChart key={family} data={data} family={family} metric={metric} domain={domain} language={language} />)}</div>
          <aside className="bau3-insight" aria-label={`${t.insight} · ${t[metric]}`}><h3>{t.insight}</h3><p><EmphasizedNumbers text={analysis?.paragraph ?? t.noData} /></p></aside>
        </section>
      })}</div>
    </div>
  )
}
