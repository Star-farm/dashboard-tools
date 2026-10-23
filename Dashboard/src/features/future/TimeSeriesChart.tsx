import { useState } from 'react'
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { Language } from '../../i18n'
import { yearTicks } from '../../utils/yearTicks'
import EmphasizedNumbers from '../../components/EmphasizedNumbers'
import type { ChartPoint, Currency, Metric } from './futureTypes'
import { analyzeChart, formatValue, laborAxisDomain, metricUnit, SERIES_COLORS } from './chartAnalysis'
import { futureText } from './futureText'

interface Props {
  metric: Metric
  points: ChartPoint[]
  currency: Currency
  language: Language
}

export default function TimeSeriesChart({ metric, points, currency, language }: Props) {
  const [chartWidth, setChartWidth] = useState(800)
  const t = futureText[language]
  const analysis = analyzeChart(points, metric, currency, language)
  const title = t[`${metric}Title`]
  const unit = metricUnit(metric, currency, language)
  const compactNumber = new Intl.NumberFormat(language, { notation: 'compact', maximumFractionDigits: 1 })
  const ticks = yearTicks(points[0]?.year, points.at(-1)?.year ?? points[0]?.year, chartWidth, 80)
  const yearDomain = points.length === 1 ? [points[0].year - 0.5, points[0].year + 0.5] : ['dataMin', 'dataMax']

  return (
    <article className="future-chart-card" id={`future-${metric}`} aria-labelledby={`${metric}-title`}>
      <header className="chart-card-header">
        <div className="chart-heading"><h2 id={`${metric}-title`}>{title}</h2><p>{t[`${metric}Subtitle`]}</p></div>
        <span className="chart-direction">{t[`${metric}Direction`]}</span>
      </header>
      {analysis ? (
        <>
          <div className="chart-and-insight">
            <div className="chart-area">
              <div className="chart-meta"><span className="chart-unit">{t.unit}: {unit}</span><ul className="chart-legend"><li><span className="legend-line green" />{analysis.firstLabel}</li><li><span className="legend-line red" />{analysis.secondLabel}</li></ul></div>
              <div className="timeseries-plot" role="group" aria-label={`${title} · ${points[0]?.year}–${points.at(-1)?.year} · ${unit}`}>
                <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 800, height: 310 }} onResize={setChartWidth}>
                  <LineChart data={points} accessibilityLayer margin={{ top: 12, right: 18, left: 0, bottom: 8 }}>
                    <CartesianGrid stroke="#b5c2aa" strokeWidth={1} />
                    <XAxis dataKey="year" type="number" domain={yearDomain} ticks={ticks} interval={0} allowDecimals={false} tickLine={false} axisLine={{ stroke: '#819275', strokeWidth: 1 }} tickMargin={12} tick={{ fill: '#64735b', fontSize: 11 }} />
                    <YAxis width={62} domain={metric === 'labor' ? laborAxisDomain(points) : [(min: number) => Math.min(0, min), 'auto']} tickFormatter={(value) => compactNumber.format(Number(value))} axisLine={{ stroke: '#819275', strokeWidth: 1 }} tickLine={false} tickMargin={8} tick={{ fill: '#64735b', fontSize: 11 }} />
                    {metric !== 'labor' && <ReferenceLine y={0} stroke="#819275" />}
                    <Tooltip shared isAnimationActive={false} labelFormatter={(value) => `${t.year} ${value}`} formatter={(value) => `${formatValue(Number(value), metric, currency, language)} ${unit}`} contentStyle={{ background: '#fffef9', border: '1px solid #d7dfcc', borderRadius: 8, fontSize: 12, lineHeight: 1.8 }} wrapperStyle={{ maxWidth: 'min(300px, 85vw)', whiteSpace: 'normal' }} cursor={{ stroke: '#abb99d', strokeDasharray: '3 3' }} />
                    <Line type="linear" dataKey="first" name={analysis.firstLabel} stroke={SERIES_COLORS.first} strokeWidth={3} dot={{ r: 3, fill: SERIES_COLORS.first, stroke: '#fffefa', strokeWidth: 1 }} activeDot={{ r: 5, stroke: '#fff', strokeWidth: 2 }} connectNulls={false} isAnimationActive={false} />
                    <Line type="linear" dataKey="second" name={analysis.secondLabel} stroke={SERIES_COLORS.second} strokeWidth={3} dot={{ r: 3, fill: SERIES_COLORS.second, stroke: '#fffefa', strokeWidth: 1 }} activeDot={{ r: 5, stroke: '#fff', strokeWidth: 2 }} connectNulls={false} isAnimationActive={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <p className="chart-x-label">{t.year}</p>
            </div>
            <aside className="chart-insight" aria-label={`${t.insight} — ${title}`}>
              <h3 className="insight-eyebrow">{t.insight}</h3>
              <p><EmphasizedNumbers text={analysis.paragraph} /></p>
            </aside>
          </div>
        </>
      ) : <p className="chart-no-data">{t.noData}</p>}
    </article>
  )
}
