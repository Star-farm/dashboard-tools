import ChartInfo from '../../components/ChartInfo'
import ChartUnitLabel from '../../components/ChartUnitLabel'
import { CHART_TICK, scenarioColor, scenarioLineStyle } from '../../components/chartStyles'
import ChartSeriesLegend from '../../components/ChartSeriesLegend'
import { useState } from 'react'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { Language } from '../../i18n'
import { yearTicks } from '../../utils/yearTicks'
import { lineAxisScale } from '../../utils/lineAxisScale'
import { distinctAxisFormatter } from '../../utils/distinctAxisFormatter'
import type { Bau3Family } from '../economics/bau3Types'
import { bau3Text } from '../economics/bau3Text'
import type { ResourceData, ResourceMetric } from './resourceTypes'
import { resourceLinePoints, resourceNumber, resourceUnit } from './resourceAnalysis'
import { resourceText } from './resourceText'
import ConditionFilters, { ConditionLegend } from '../../components/ConditionFilters'
import { useConditionFilters } from '../../components/useConditionFilters'
import { bau3Conditions } from '../economics/bau3Types'
import { valueForChart } from '../../utils/chartMissingValue'

export default function ResourceLineChart({ data, family, metric, language, title }: { data: ResourceData; family: Bau3Family; metric: ResourceMetric; domain: [number, number]; language: Language; title?: string }) {
  const [width, setWidth] = useState(620)
  const filters = useConditionFilters()
  const visibleConditions = filters.visible
  const t = resourceText[language], labels = bau3Text[language], points = resourceLinePoints(data, family, metric), unit = resourceUnit(metric, language)
  const chartPoints = points.map((point) => ({ ...point, ...Object.fromEntries(bau3Conditions.map((condition) => [condition, valueForChart(point[condition])])) }))
  const yScale = lineAxisScale(chartPoints.flatMap((point) => bau3Conditions.map((condition) => point[condition])))
  const axisNumber = distinctAxisFormatter(yScale.ticks, language)
  const hasData = chartPoints.length > 0
  return <article className={`bau3-chart bau3-chart-${family}`} aria-labelledby={`resource-${metric}-${family}-title`}>
    <header><h3 id={`resource-${metric}-${family}-title`}>{title ?? t[family]}</h3></header>
    <ConditionFilters language={language} filters={filters} normalResourceLabel={t.normal} />
    {hasData ? <div className="bau3-plot" role="group" aria-label={`${t[metric]} · ${t[family]} · ${unit}`}><ChartUnitLabel unit={unit} language={language} /><ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 620, height: 310 }} onResize={setWidth}>
      <LineChart data={chartPoints} accessibilityLayer margin={{ top: 32, right: 20, left: 0, bottom: 24 }}>
        <CartesianGrid stroke="#b5c2aa" strokeWidth={1} />
        <XAxis dataKey="year" type="number" domain={[data.startYear, data.endYear]} ticks={yearTicks(data.startYear, data.endYear, width, 88)} interval={0} allowDecimals={false} tickLine={false} tickMargin={10} axisLine={{ stroke: '#819275' }} tick={CHART_TICK} label={{ value: t.year, position: 'insideBottom', offset: -18, fill: CHART_TICK.fill, fontSize: CHART_TICK.fontSize, fontWeight: CHART_TICK.fontWeight }} />
        <YAxis width={width < 420 ? 46 : 68} domain={yScale.domain} ticks={yScale.ticks} allowDataOverflow tickFormatter={(value) => axisNumber(Number(value))} tickLine={false} tickMargin={width < 420 ? 4 : 8} axisLine={{ stroke: '#819275' }} tick={CHART_TICK} />
        <Tooltip shared isAnimationActive={false} content={(props) => <ChartInfo {...props} yearLabel={t.year} format={(value) => resourceNumber(Number(value), language)} unit={unit} />} cursor={{ fill: '#254f3d0a' }} />
        {visibleConditions.map((condition) => <Line key={condition} type="linear" dataKey={condition} name={labels[condition].replace(/Tài nguyên bình thường|Normal resources/g, t.normal)} {...scenarioLineStyle(family, condition)} connectNulls={false} isAnimationActive={false} />)}
      </LineChart>
    </ResponsiveContainer></div> : <p className="bau3-no-data">{t.noData}</p>}
    {hasData && <ChartSeriesLegend language={language} legendTitle={language === 'vi' ? 'Chú giải:' : 'Legend:'} label={language === 'vi' ? 'Mô hình' : 'Model'} items={[{ key: family, label: t[family], color: scenarioColor(family), kind: 'bar' }]} />}
    <ConditionLegend language={language} conditions={visibleConditions} normalResourceLabel={t.normal} />
  </article>
}
