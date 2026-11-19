import ChartInfo from '../../components/ChartInfo'
import ChartUnitLabel from '../../components/ChartUnitLabel'
import ChartSeriesLegend from '../../components/ChartSeriesLegend'
import { CHART_TICK, scenarioColor } from '../../components/chartStyles'
import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { Language } from '../../i18n'
import type { ResourceData, ResourceMetric, ResourceSeries } from './resourceTypes'
import { resourceNumber, resourceStats, resourceUnit } from './resourceAnalysis'
import { resourceText } from './resourceText'
import { distinctAxisFormatter } from '../../utils/distinctAxisFormatter'
import { zeroBasedAxisScale } from '../../utils/zeroBasedAxisScale'
import { displayChartValue, valueForChart } from '../../utils/chartMissingValue'

export default function ResourceBarChart({ data, series, metric, language }: { data: ResourceData; series: ResourceSeries[]; metric: ResourceMetric; language: Language }) {
  const t = resourceText[language], unit = resourceUnit(metric, language)
  const points = (['bau', 'oneMha'] as const).map((group) => ({ group, label: t[group], value: resourceStats(series.filter((item) => (item.family === 'oneMha') === (group === 'oneMha')), metric, data.startYear, data.endYear).mean, color: scenarioColor(group) }))
  const chartPoints = points.map((point) => ({ ...point, value: valueForChart(point.value, true) }))
  const axisValues = (['bau', 'oneMha'] as const).map((group) => resourceStats(data.series.filter((item) => (item.family === 'oneMha') === (group === 'oneMha')), metric, data.startYear, data.endYear).mean ?? 0)
  const axisScale = zeroBasedAxisScale(axisValues)
  const axisNumber = distinctAxisFormatter(axisScale.ticks, language)
  return <article className="comparison-chart-card" aria-labelledby={`resource-bar-${metric}-title`}>
    <header><h2 id={`resource-bar-${metric}-title`}>{t[metric]} {t.period.toLocaleLowerCase(language)} {data.startYear} - {data.endYear}</h2></header>
    {chartPoints.length > 0 ? <div className="comparison-plot" role="group" aria-label={`${t[metric]} · ${unit}`}><ChartUnitLabel unit={unit} language={language} /><ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 600, height: 280 }}>
      <BarChart data={chartPoints} accessibilityLayer margin={{ top: 28, right: 20, bottom: 24, left: 0 }} barCategoryGap="30%">
        <CartesianGrid vertical={false} stroke="#b5c2aa" />
        <XAxis dataKey="label" axisLine={{ stroke: '#819275' }} tickLine={false} tick={CHART_TICK} tickMargin={12} interval={0} height={48} label={{ value: language === 'vi' ? 'Mô hình' : 'Model', position: 'insideBottom', offset: -18, fill: CHART_TICK.fill, fontSize: CHART_TICK.fontSize, fontWeight: CHART_TICK.fontWeight }} />
        <YAxis width={62} domain={axisScale.domain} ticks={axisScale.ticks} tickFormatter={(value) => axisNumber(Number(value))} axisLine={false} tickLine={false} tick={CHART_TICK} />
        <Tooltip isAnimationActive={false} cursor={{ fill: '#254f3d0a' }} content={(props) => <ChartInfo {...props} format={(value) => resourceNumber(displayChartValue(value), language)} unit={unit} />} />
        <Bar dataKey="value" name={t[metric]} maxBarSize={84} radius={[4, 4, 0, 0]} isAnimationActive={false}>
          {chartPoints.map((point) => <Cell key={point.group} fill={point.color} />)}
          <LabelList dataKey="value" position="top" formatter={(value) => value === null ? '' : resourceNumber(displayChartValue(Number(value)), language)} style={{ fontFamily: 'inherit', fontSize: 'var(--chart-axis-size)', fontWeight: 700, fill: '#30472d' }} />
        </Bar>
      </BarChart>
    </ResponsiveContainer></div> : <p className="comparison-no-data">{t.noData}</p>}
    {chartPoints.length > 0 && <ChartSeriesLegend language={language} legendTitle={language === 'vi' ? 'Chú giải:' : 'Legend:'} label={language === 'vi' ? 'Mô hình' : 'Model'} items={points.map((point) => ({ key: point.group, label: point.label, color: point.color, kind: 'bar' }))} />}
    <dl className="comparison-values">{points.map((point) => <div key={point.group}><dt><span className={`comparison-swatch ${point.group}`} aria-hidden="true" />{point.label}</dt><dd><strong>{resourceNumber(point.value ?? 0, language)}</strong> <span>{unit}</span></dd></div>)}</dl>
  </article>
}
