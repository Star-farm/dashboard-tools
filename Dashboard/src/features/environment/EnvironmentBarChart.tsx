import ChartInfo from '../../components/ChartInfo'
import ChartUnitLabel from '../../components/ChartUnitLabel'
import { CHART_TICK, scenarioColor } from '../../components/chartStyles'
import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { Language } from '../../i18n'
import type { EnvironmentData, EnvironmentMetric, EnvironmentSeries } from './environmentTypes'
import { environmentNumber, environmentStats, environmentUnit } from './environmentAnalysis'
import { environmentText } from './environmentText'
import { distinctAxisFormatter } from '../../utils/distinctAxisFormatter'
import { zeroBasedAxisScale } from '../../utils/zeroBasedAxisScale'

export default function EnvironmentBarChart({ data, series, metric, language }: { data: EnvironmentData; series: EnvironmentSeries[]; metric: EnvironmentMetric; language: Language }) {
  const t = environmentText[language], unit = environmentUnit(metric, language)
  const points = (['bau', 'oneMha'] as const).map((group) => ({ group, label: t[group], value: environmentStats(series.filter((item) => (item.family === 'oneMha') === (group === 'oneMha')), metric, data.startYear, data.endYear).mean, color: scenarioColor(group) }))
  const axisValues = (['bau', 'oneMha'] as const).map((group) => environmentStats(data.series.filter((item) => (item.family === 'oneMha') === (group === 'oneMha')), metric, data.startYear, data.endYear).mean)
  const axisScale = zeroBasedAxisScale(axisValues)
  const axisNumber = distinctAxisFormatter(axisScale.ticks, language)
  return <article className="comparison-chart-card" aria-labelledby={`environment-bar-${metric}-title`}>
    <header><h2 id={`environment-bar-${metric}-title`}>{t[metric]} {t.period.toLocaleLowerCase(language)} {data.startYear} - {data.endYear}</h2></header>
    {points.some((point) => point.value !== null) ? <div className="comparison-plot" role="group" aria-label={`${t[metric]} · ${unit}`}><ChartUnitLabel unit={unit} language={language} /><ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 600, height: 280 }}>
      <BarChart data={points} accessibilityLayer margin={{ top: 28, right: 20, bottom: 8, left: 0 }} barCategoryGap="30%">
        <CartesianGrid vertical={false} stroke="#b5c2aa" />
        <XAxis dataKey="label" axisLine={{ stroke: '#819275' }} tickLine={false} tick={CHART_TICK} tickMargin={12} interval={0} height={48} />
        <YAxis width={62} domain={axisScale.domain} ticks={axisScale.ticks} tickFormatter={(value) => axisNumber(Number(value))} axisLine={false} tickLine={false} tick={CHART_TICK} />
        <Tooltip isAnimationActive={false} cursor={{ fill: '#254f3d0a' }} content={(props) => <ChartInfo {...props} format={(value) => environmentNumber(value, language)} unit={unit} />} />
        <Bar dataKey="value" name={t[metric]} maxBarSize={84} radius={[4, 4, 0, 0]} isAnimationActive={false}>
          {points.map((point) => <Cell key={point.group} fill={point.color} />)}
          <LabelList dataKey="value" position="top" formatter={(value) => value === null ? '' : environmentNumber(Number(value), language)} style={{ fontFamily: 'inherit', fontSize: 'var(--chart-axis-size)', fontWeight: 700, fill: '#30472d' }} />
        </Bar>
      </BarChart>
    </ResponsiveContainer></div> : <p className="comparison-no-data">{t.noData}</p>}
    <dl className="comparison-values">{points.map((point) => <div key={point.group}><dt><span className={`comparison-swatch ${point.group}`} aria-hidden="true" />{point.label}</dt><dd>{point.value === null ? '—' : <><strong>{environmentNumber(point.value, language)}</strong> <span>{unit}</span></>}</dd></div>)}</dl>
  </article>
}
