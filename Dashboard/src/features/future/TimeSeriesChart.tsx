import ChartInfo from '../../components/ChartInfo'
import ChartUnitLabel from '../../components/ChartUnitLabel'
import { CHART_TICK, scenarioLineStyle } from '../../components/chartStyles'
import { useState } from 'react'
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { Language } from '../../i18n'
import { yearTicks } from '../../utils/yearTicks'
import { lineAxisScale } from '../../utils/lineAxisScale'
import { distinctAxisFormatter } from '../../utils/distinctAxisFormatter'
import EmphasizedNumbers from '../../components/EmphasizedNumbers'
import type { ChartPoint, Currency, Metric } from './futureTypes'
import { analyzeChart, metricUnit } from './chartAnalysis'
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
  const chartPoints = metric === 'income' && currency === 'VND' ? points.map((point) => ({ ...point, first: point.first === null ? null : point.first / 1_000_000, second: point.second === null ? null : point.second / 1_000_000 })) : points
  const yScale = lineAxisScale(chartPoints.flatMap((point) => [point.first, point.second]))
  const analysis = analyzeChart(points, metric, currency, language)
  const title = t[`${metric}Title`]
  const unit = metricUnit(metric, currency, language)
  const chartUnit = metric === 'income' && currency === 'VND' ? 'triệu VNĐ/ha' : unit
  const axisNumber = distinctAxisFormatter(yScale.ticks, language, true)
  const ticks = yearTicks(points[0]?.year, points.at(-1)?.year ?? points[0]?.year, chartWidth, 80)

  return (
    <article className="future-chart-card" id={`future-${metric}`} aria-labelledby={`${metric}-title`}>
      <header className="chart-card-header">
        <div className="chart-heading"><h2 id={`${metric}-title`}>{title}</h2><p>{t[`${metric}Subtitle`]}</p></div>
      </header>
      {analysis ? (
        <>
          <div className="chart-and-insight">
            <div className="chart-area">
              <div className="timeseries-plot" role="group" aria-label={`${title} · ${points[0]?.year}–${points.at(-1)?.year} · ${unit}`}>
                <ChartUnitLabel unit={chartUnit} language={language} />
                <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 800, height: 310 }} onResize={setChartWidth}>
                  <LineChart data={chartPoints} accessibilityLayer margin={{ top: 30, right: 18, left: 0, bottom: 8 }}>
                    <CartesianGrid stroke="#b5c2aa" strokeWidth={1} />
                    <XAxis dataKey="year" type="number" domain={points.length === 1 ? [points[0].year - .5, points[0].year + .5] : ['dataMin', 'dataMax']} ticks={ticks} interval={0} allowDecimals={false} tickLine={false} axisLine={{ stroke: '#819275', strokeWidth: 1 }} tickMargin={12} tick={CHART_TICK} />
                    <YAxis width={chartWidth < 420 ? 46 : 62} domain={yScale.domain} ticks={yScale.ticks} tickFormatter={(value) => axisNumber(Number(value))} axisLine={{ stroke: '#819275', strokeWidth: 1 }} tickLine={false} tickMargin={chartWidth < 420 ? 4 : 8} tick={CHART_TICK} />
                    {metric !== 'labor' && <ReferenceLine y={0} stroke="#819275" />}
                    <Tooltip shared isAnimationActive={false} content={(props) => <ChartInfo {...props} yearLabel={t.year} format={(value) => new Intl.NumberFormat(language, { maximumFractionDigits: 2 }).format(value)} unit={chartUnit} />} cursor={{ fill: '#254f3d0a' }} />
                    <Line type="linear" dataKey="first" name={analysis.firstLabel} {...scenarioLineStyle('oneMha')} connectNulls={false} isAnimationActive={false} />
                    <Line type="linear" dataKey="second" name={analysis.secondLabel} {...scenarioLineStyle('bau')} connectNulls={false} isAnimationActive={false} />
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
