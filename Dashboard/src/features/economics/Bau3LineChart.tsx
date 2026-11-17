import ChartInfo from '../../components/ChartInfo'
import ChartUnitLabel from '../../components/ChartUnitLabel'
import { CHART_TICK, scenarioLineStyle } from '../../components/chartStyles'
import { useState } from 'react'
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { Language } from '../../i18n'
import { yearTicks } from '../../utils/yearTicks'
import type { Bau3Data, Bau3Family, Bau3Metric } from './bau3Types'
import { bau3ChartUnit, selectBau3Points } from './bau3Analysis'
import { bau3Text } from './bau3Text'
import ConditionFilters, { ConditionLegend } from '../../components/ConditionFilters'
import { useConditionFilters } from '../../components/useConditionFilters'

export default function Bau3LineChart({ data, family, metric, domain, language, title }: {
  data: Bau3Data
  family: Bau3Family
  metric: Bau3Metric
  domain: [number, number]
  language: Language
  title?: string
}) {
  const [chartWidth, setChartWidth] = useState(620)
  const filters = useConditionFilters()
  const visibleConditions = filters.visible
  const t = bau3Text[language]
  const currency = language === 'vi' ? 'VND' : 'USD'
  const points = selectBau3Points(data, family, metric, currency)
  const unit = bau3ChartUnit(metric, language)
  const compact = new Intl.NumberFormat(language, { notation: 'compact', maximumFractionDigits: 1 })
  const ticks = yearTicks(data.startYear, data.endYear, chartWidth, 88)
  const hasData = points.some((point) => visibleConditions.some((condition) => point[condition] !== null))
  return (
    <article className={`bau3-chart bau3-chart-${family}`} aria-labelledby={`bau3-${metric}-${family}-title`}>
      <header><h3 id={`bau3-${metric}-${family}-title`} title={family === 'oneMha' ? t.oneMhaDescription : undefined}>{title ?? t[family]}</h3></header>
      <ConditionFilters language={language} filters={filters} />
      {hasData ? <div className="bau3-plot" role="group" aria-label={`${t[metric]} · ${t[family]} · ${data.startYear}–${data.endYear} · ${unit}`}>
        <ChartUnitLabel unit={unit} />
        <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 620, height: 310 }} onResize={setChartWidth}>
          <LineChart data={points} accessibilityLayer margin={{ top: 32, right: 20, left: 0, bottom: 8 }}>
            <CartesianGrid stroke="#b5c2aa" strokeWidth={1} />
            <XAxis dataKey="year" type="number" domain={[data.startYear, data.endYear]} ticks={ticks} interval={0} allowDecimals={false} tickLine={false} tickMargin={10} axisLine={{ stroke: '#819275' }} tick={CHART_TICK} />
            <YAxis width={68} domain={domain} allowDataOverflow tickFormatter={(value) => `${compact.format(Number(value))}${metric === 'margin' ? ' %' : ''}`} tickLine={false} tickMargin={8} axisLine={{ stroke: '#819275' }} tick={CHART_TICK} />
            {domain[0] <= 0 && domain[1] >= 0 && <ReferenceLine y={0} stroke="#819275" />}
            <Tooltip
  shared
  isAnimationActive={false}
  content={(props) => (
    <ChartInfo
      {...props}
      yearLabel={t.year}
      format={(value) =>
        `${new Intl.NumberFormat(language, { maximumFractionDigits: 2 }).format(Number(value))} ${unit}`
      }
    />
  )}
  cursor={{ stroke: '#819275', strokeDasharray: '3 3' }}
  wrapperStyle={{ pointerEvents: 'none', zIndex: 10 }}
/>
            {visibleConditions.map((condition) => <Line key={condition} type="linear" dataKey={condition} name={t[condition]} {...scenarioLineStyle(family, condition, true, false)} connectNulls={false} isAnimationActive={false} />)}
          </LineChart>
        </ResponsiveContainer>
      </div> : <p className="bau3-no-data">{t.noData}</p>}
      <ConditionLegend language={language} conditions={visibleConditions} />
    </article>
  )
}
