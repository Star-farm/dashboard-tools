import { useEffect, useState } from 'react'
import { getScrollBehavior } from '../../app/scrollBehavior'
import data from '../../data/economics-comparison.json'
import type { Language } from '../../i18n'
import { comparisonMetrics, selectComparisonCohort } from './comparisonData'
import type { ComparisonClimate, ComparisonResource, EconomicComparisonData } from './comparisonData'
import { economicsText } from './economicsText'
import { comparisonText } from './comparisonText'
import { comparisonSummary } from './comparisonAnalysis'
import EmphasizedNumbers from '../../components/EmphasizedNumbers'
import ComparisonBarChart from './ComparisonBarChart'
import '../../styles/economic-comparison.css'

const comparison = data as EconomicComparisonData

export default function EconomicComparisonPage({ language }: { language: Language }) {
  const t = economicsText[language]
  const text = comparisonText[language]
  const [climate, setClimate] = useState<ComparisonClimate>('all')
  const [resource, setResource] = useState<ComparisonResource>('all')
  const cohort = selectComparisonCohort(comparison, climate, resource)

  useEffect(() => {
    document.getElementById('economics-comparison')?.scrollIntoView?.({ block: 'start', behavior: getScrollBehavior() })
  }, [])

  return (
    <div className="economic-comparison-page page-shell" id="economics-comparison">
      <section className="intro" aria-labelledby="economic-comparison-title"><h1 id="economic-comparison-title">{text.title}</h1></section>
      <section className="comparison-filters" aria-label={text.filters}>
        <fieldset><legend>{t.climate}</legend><div className="comparison-segmented">{(['all', 'severe', 'mild'] as const).map((option) => <button key={option} type="button" aria-pressed={climate === option} aria-label={option === 'all' ? text.allWeather : undefined} onClick={() => setClimate(option)}>{option === 'all' ? t.all : t[option]}</button>)}</div></fieldset>
        <fieldset><legend>{t.resource}</legend><div className="comparison-segmented">{(['all', 'shortage', 'normal'] as const).map((option) => <button key={option} type="button" aria-pressed={resource === option} aria-label={option === 'all' ? text.allResources : undefined} onClick={() => setResource(option)}>{option === 'all' ? t.all : option === 'normal' ? text.normalResource : t.shortage}</button>)}</div></fieldset>
        {(climate !== 'all' || resource !== 'all') && <button className="comparison-reset" type="button" onClick={() => { setClimate('all'); setResource('all') }}>{text.reset}<span aria-hidden="true"> ↺</span></button>}
      </section>
      <p className="sr-only" role="status">{t.climate}: {climate === 'all' ? t.all : t[climate]}. {t.resource}: {resource === 'all' ? t.all : resource === 'normal' ? text.normalResource : t.shortage}.</p>
      {cohort && <aside className="comparison-summary" aria-labelledby="comparison-summary-title"><h2 id="comparison-summary-title">{text.summary}</h2><p><EmphasizedNumbers text={comparisonSummary(cohort, language, comparison.startYear, comparison.endYear)} /></p></aside>}
      {cohort ? <div className="comparison-grid">{comparisonMetrics.map((metric) => <ComparisonBarChart key={metric} metric={metric} cohort={cohort} language={language} startYear={comparison.startYear} endYear={comparison.endYear} />)}</div> : <p className="comparison-no-data">{text.noData}</p>}
    </div>
  )
}
