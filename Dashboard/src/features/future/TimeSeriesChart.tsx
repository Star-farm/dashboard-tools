import ChartInfo from '../../components/ChartInfo'
import ChartUnitLabel from '../../components/ChartUnitLabel'
import { CHART_TICK, scenarioLineStyle } from '../../components/chartStyles'
import { useState } from 'react'
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { Language } from '../../i18n'
import { yearTicks } from '../../utils/yearTicks'
import EmphasizedNumbers from '../../components/EmphasizedNumbers'
import ChartLegend from '../../components/ChartLegend'
import { useChartSelection } from '../../components/chartSelectionContext'
import type { ChartPoint, Currency, Metric } from './futureTypes'
import { analyzeChart, laborAxisDomain, metricUnit, SERIES_COLORS } from './chartAnalysis'
import { futureText } from './futureText'

interface Props {
  metric: Metric
  points: ChartPoint[]
  currency: Currency
  language: Language
}

export default function TimeSeriesChart({ metric, points, currency, language }: Props) {
  const [chartWidth, setChartWidth] = useState(800)
  const [selection, setSelection] = useChartSelection<'first' | 'second' | 'all'>(metric === 'methane' ? 'futureAwd' : 'futureModel', 'all')
  const t = futureText[language]
  const chartPoints = metric === 'income' && currency === 'VND' ? points.map((point) => ({ ...point, first: point.first === null ? null : point.first / 1_000_000, second: point.second === null ? null : point.second / 1_000_000 })) : points
  const analysis = analyzeChart(points, metric, currency, language)
  const title = t[`${metric}Title`]
  const unit = metricUnit(metric, currency, language)
  const chartUnit = metric === 'income' && currency === 'VND' ? 'triệu VNĐ/ha' : unit
  const compactNumber = new Intl.NumberFormat(language, { notation: 'compact', maximumFractionDigits: 1 })
  const ticks = yearTicks(points[0]?.year, points.at(-1)?.year ?? points[0]?.year, chartWidth, 80)

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
              <div className="timeseries-plot" role="group" aria-label={`${title} · ${points[0]?.year}–${points.at(-1)?.year} · ${unit}`}>
                <ChartUnitLabel unit={chartUnit} />
                <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 800, height: 310 }} onResize={setChartWidth}>
                  <LineChart data={chartPoints} accessibilityLayer margin={{ top: 30, right: 18, left: 0, bottom: 8 }}>
                    <CartesianGrid stroke="#b5c2aa" strokeWidth={1} />
                    <XAxis dataKey="year" type="number" domain={points.length === 1 ? [points[0].year - .5, points[0].year + .5] : ['dataMin', 'dataMax']} ticks={ticks} interval={0} allowDecimals={false} tickLine={false} axisLine={{ stroke: '#819275', strokeWidth: 1 }} tickMargin={12} tick={CHART_TICK} />
                    <YAxis width={62} domain={metric === 'labor' ? laborAxisDomain(points) : [(min: number) => Math.min(0, min), 'auto']} tickFormatter={(value) => compactNumber.format(Number(value))} axisLine={{ stroke: '#819275', strokeWidth: 1 }} tickLine={false} tickMargin={8} tick={CHART_TICK} />
                    {metric !== 'labor' && <ReferenceLine y={0} stroke="#819275" />}
                    <Tooltip shared isAnimationActive={false} content={(props) => <ChartInfo {...props} yearLabel={t.year} format={(value) => `${new Intl.NumberFormat(language, { maximumFractionDigits: 2 }).format(value)} ${chartUnit}`} />} cursor={{ fill: '#254f3d0a' }} />
                    {selection !== 'second' && <Line type="linear" dataKey="first" name={analysis.firstLabel} {...scenarioLineStyle('oneMha', undefined, false, selection !== 'all')} connectNulls={false} isAnimationActive={false} />}
                    {selection !== 'first' && <Line type="linear" dataKey="second" name={analysis.secondLabel} {...scenarioLineStyle('bau', undefined, false, selection !== 'all')} connectNulls={false} isAnimationActive={false} />}
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <p className="chart-x-label">{t.year}</p>
              <ChartLegend language={language} label={language === 'vi' ? 'Chọn nhóm kịch bản' : 'Choose scenario group'} items={[{ key: 'first', label: analysis.firstLabel, color: SERIES_COLORS.first }, { key: 'second', label: analysis.secondLabel, color: SERIES_COLORS.second, dashed: selection === 'all' }]} selected={selection} onSelect={setSelection} />
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
