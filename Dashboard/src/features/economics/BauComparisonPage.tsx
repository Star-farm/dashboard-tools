import PageDescription from '../../components/PageDescription'
import { useEffect } from 'react'
import AnalysisView from '../../components/AnalysisView'
import type { Language } from '../../i18n'
import { getScrollBehavior } from '../../app/scrollBehavior'
import EmphasizedNumbers from '../../components/EmphasizedNumbers'
import ScenarioComparisonChart from '../../components/ScenarioComparisonChart'
import ScenarioAbbreviations from '../../components/ScenarioAbbreviations'
import { bau3Metrics } from './bau3Types'
import type { Bau3Data } from './bau3Types'
import { analyzeBau3, bau3ChartUnit, bau3Domain, selectBau3Points } from './bau3Analysis'
import { bau3Text } from './bau3Text'
import { distinctAxisFormatter } from '../../utils/distinctAxisFormatter'
import '../../styles/bau3-comparison.css'

export default function BauComparisonPage({ language, data }: { language: Language; data: Bau3Data }) {
  const t = bau3Text[language]
  const variant = data.variant ?? 'bau3s'
  const anchor = { bau3s: 'economics-bau3-vs-1mha', bau2s: 'economics-bau2-vs-1mha', bauss: 'economics-bauss-vs-1mha' }[variant]
  const title = { bau3s: t.title, bau2s: t.bau2Title, bauss: t.baussTitle }[variant]
  const currency = language === 'vi' ? 'VND' : 'USD'
  const baselineLabel = { bau3s: t.bau3Short, bau2s: t.bau2Short, bauss: t.baussShort }[variant]
  const summaryMetrics = (['income', 'yield'] as const).map((metric) => ({ metric, analysis: analyzeBau3(data, metric, language) }))
  const baselineName = language === 'vi'
    ? { bau3s: 'canh tác như thường lệ ba vụ', bau2s: 'canh tác như thường lệ hai vụ', bauss: 'canh tác như thường lệ bền vững' }[variant]
    : { bau3s: 'business as usual with three seasons', bau2s: 'business as usual with two seasons', bauss: 'sustainable business-as-usual farming' }[variant]
  const metricSummary = (metric: 'income' | 'yield', higher: number, lower: number, equal: number, count: number) => {
    const label = language === 'vi' ? metric === 'income' ? 'thu nhập ròng' : 'năng suất' : metric === 'income' ? 'net income' : 'yield'
    const direction = language === 'vi'
      ? [higher ? `cao hơn ở ${higher}/${count} nhóm` : '', lower ? `thấp hơn ở ${lower}/${count} nhóm` : '', equal ? `tương đương ở ${equal}/${count} nhóm` : ''].filter(Boolean).join(', ')
      : [higher ? `higher in ${higher}/${count} groups` : '', lower ? `lower in ${lower}/${count} groups` : '', equal ? `similar in ${equal}/${count} groups` : ''].filter(Boolean).join(', ')
    return `${label} ${direction}`
  }
  const incomeAnalysis = summaryMetrics[0].analysis
  const yieldAnalysis = summaryMetrics[1].analysis
  const summary = incomeAnalysis && yieldAnalysis
    ? language === 'vi'
      ? `Giai đoạn ${data.startYear}–${data.endYear}, so với ${baselineName}, 1Mha có ${metricSummary('income', incomeAnalysis.higher, incomeAnalysis.lower, incomeAnalysis.equal, incomeAnalysis.count)}; ${metricSummary('yield', yieldAnalysis.higher, yieldAnalysis.lower, yieldAnalysis.equal, yieldAnalysis.count)}. Khi cân nhắc áp dụng, cần xem thêm chi phí, lao động và tỷ suất lợi nhuận theo từng điều kiện.`
      : `From ${data.startYear} to ${data.endYear}, compared with ${baselineName}, 1Mha has ${metricSummary('income', incomeAnalysis.higher, incomeAnalysis.lower, incomeAnalysis.equal, incomeAnalysis.count)}; ${metricSummary('yield', yieldAnalysis.higher, yieldAnalysis.lower, yieldAnalysis.equal, yieldAnalysis.count)}. Consider costs, labor and profit margin under each condition before implementation.`
    : ''
  useEffect(() => {
    document.getElementById(anchor)?.scrollIntoView?.({ block: 'start', behavior: getScrollBehavior() })
  }, [anchor])
  return (
    <div className="bau3-page page-shell" id={anchor}>
      <section className="intro bau3-intro" aria-labelledby="bau-comparison-title"><h1 id="bau-comparison-title"><ScenarioAbbreviations text={title} language={language} /></h1><PageDescription language={language} kind="pair" topic="economics" /></section>
      <AnalysisView language={language} config={{ topic: 'economics', kind: 'comparison', family: variant }}>
      <aside className="bau3-insight bau3-comparison-summary" aria-labelledby="bau-comparison-summary-title"><h3 id="bau-comparison-summary-title">{language === 'vi' ? 'Nhận xét tổng hợp' : 'Overall assessment'}</h3><p><EmphasizedNumbers text={summary || t.noData} maxSentences={3} /></p></aside>
      <div className="bau3-sections">{bau3Metrics.map((metric) => {
        const domain = bau3Domain(data, metric, currency)
        const analysis = analyzeBau3(data, metric, language)
        return <section className="bau3-section" key={metric} aria-labelledby={`bau-${variant}-${metric}-title`}>
          <h2 id={`bau-${variant}-${metric}-title`}>{t[metric]}</h2>
          <ScenarioComparisonChart chartType="line" key={variant} language={language} title={t[metric]} baselineLabel={baselineLabel} baseline={selectBau3Points(data, variant, metric, currency)} oneMha={selectBau3Points(data, 'oneMha', metric, currency)} startYear={data.startYear} endYear={data.endYear} domain={domain} unit={bau3ChartUnit(metric, language)} formatValue={(value) => new Intl.NumberFormat(language, { maximumFractionDigits: 2 }).format(value)} formatAxis={(value, ticks) => `${distinctAxisFormatter(ticks, language, true)(value)}${metric === 'margin' ? '%' : ''}`} />
          <aside className="bau3-insight" aria-label={`${t.insight} · ${t[metric]}`}><h3>{t.insight}</h3><p><EmphasizedNumbers text={analysis?.paragraph ?? t.noData} /></p></aside>
        </section>
      })}</div>
      </AnalysisView>
    </div>
  )
}
