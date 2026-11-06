import { useEffect, useState } from 'react'
import { getScrollBehavior } from '../../app/scrollBehavior'
import data from '../../data/future-series.json'
import type { Language } from '../../i18n'
import type { Currency } from './futureTypes'
import { selectChartPoints } from './chartAnalysis'
import { futureText } from './futureText'
import TimeSeriesChart from './TimeSeriesChart'
import '../../styles/future.css'

export default function FuturePage({ language }: { language: Language }) {
  const t = futureText[language]
  const currency: Currency = language === 'vi' ? 'VND' : 'USD'
  const [startYear, setStartYear] = useState(data.startYear)
  const [endYear, setEndYear] = useState(data.endYear)

  useEffect(() => {
    document.getElementById(window.location.hash.slice(1) || 'future')?.scrollIntoView?.({ block: 'start', behavior: getScrollBehavior() })
  }, [])

  return (
    <div className="future-page page-shell" id="future">
      <section className="intro future-intro" aria-labelledby="future-title">
        <div><h1 id="future-title">{t.title}</h1></div>
        <span className="future-period">{startYear}<span aria-hidden="true">—</span>{endYear}</span>
      </section>

      <section className="future-controls" aria-label={t.controls}>
        <div className="year-controls"><label>{t.fromYear}<select value={startYear} onChange={(event) => setStartYear(Number(event.target.value))}>{data.annual.map(({ year }) => <option value={year} key={year} disabled={year > endYear}>{year}</option>)}</select></label><span className="year-control-divider" aria-hidden="true">{'>'}</span><label>{t.toYear}<select value={endYear} onChange={(event) => setEndYear(Number(event.target.value))}>{data.annual.map(({ year }) => <option value={year} key={year} disabled={year < startYear}>{year}</option>)}</select></label></div>
      </section>

      <div className="future-charts">{(['income', 'labor', 'methane'] as const).map((metric) => <TimeSeriesChart key={metric} metric={metric} points={selectChartPoints(data.annual, metric, currency, startYear, endYear)} currency={currency} language={language} />)}</div>
    </div>
  )
}
