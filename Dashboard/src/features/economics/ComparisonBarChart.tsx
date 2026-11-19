import ChartUnitLabel from '../../components/ChartUnitLabel'
import { CHART_TICK, scenarioColor } from '../../components/chartStyles'
import { Bar, BarChart, CartesianGrid, Cell, LabelList, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import ChartInfo from '../../components/ChartInfo'
import ChartSeriesLegend from '../../components/ChartSeriesLegend'
import type { Language } from '../../i18n'
import type { ComparisonCohort, ComparisonMetric } from './comparisonData'
import { economicMetricUnits, economicsText } from './economicsText'
import { comparisonText } from './comparisonText'
import { distinctAxisFormatter } from '../../utils/distinctAxisFormatter'
import { zeroBasedAxisScale } from '../../utils/zeroBasedAxisScale'
import { ZERO_BAR_VALUE, displayChartValue } from '../../utils/chartMissingValue'

export default function ComparisonBarChart({ metric, cohort, axisCohort = cohort, language, startYear, endYear }: {
  metric: ComparisonMetric
  cohort: ComparisonCohort
  axisCohort?: ComparisonCohort
  language: Language
  startYear: number
  endYear: number
}) {
  const t = economicsText[language]
  const text = comparisonText[language]
  const currency = language === 'vi' ? 'VND' : 'USD'
  const money = economicMetricUnits[metric] === 'moneyUnit'
  const unit = money ? t.moneyUnit : metric === 'yield' ? t.yieldUnit : t.laborUnit
  const chartUnit = money && currency === 'VND' ? 'triệu VNĐ/ha' : unit
  const number = new Intl.NumberFormat(language, { minimumFractionDigits: money && language === 'vi' ? 0 : 2, maximumFractionDigits: money && language === 'vi' ? 0 : 2 })
  const chartNumber = new Intl.NumberFormat(language, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const points = (['bau', 'oneMha'] as const).map((group) => ({ group, label: t[group], value: cohort.groups[group][currency][metric], color: scenarioColor(group) }))
  const title = text[metric]
  const chartPoints = points.map((point) => ({ ...point, value: point.value === null ? ZERO_BAR_VALUE : point.value / (currency === 'VND' && money ? 1_000_000 : 1) }))
  const axisValues = (['bau', 'oneMha'] as const).map((group) => axisCohort.groups[group][currency][metric]).map((value) => value === null ? 0 : value / (currency === 'VND' && money ? 1_000_000 : 1))
  const axisScale = zeroBasedAxisScale(axisValues)
  const axisNumber = distinctAxisFormatter(axisScale.ticks, language, true)

  return (
    <article className="comparison-chart-card" aria-labelledby={`comparison-${metric}-title`}>
      <header><h2 id={`comparison-${metric}-title`}>{title} {text.period} {startYear} - {endYear}</h2></header>
      {chartPoints.length > 0 ? <div className="comparison-plot" role="group" aria-label={`${title} · ${startYear}–${endYear} · ${chartUnit}`}>
        <ChartUnitLabel unit={chartUnit} language={language} />
        <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 600, height: 280 }}>
          <BarChart data={chartPoints} accessibilityLayer margin={{ top: 28, right: 20, bottom: 24, left: 0 }} barCategoryGap="30%">
            <CartesianGrid vertical={false} stroke="#b5c2aa" />
            <XAxis dataKey="label" axisLine={{ stroke: '#819275' }} tickLine={false} tick={CHART_TICK} tickMargin={12} interval={0} height={48} label={{ value: language === 'vi' ? 'Mô hình' : 'Model', position: 'insideBottom', offset: -18, fill: CHART_TICK.fill, fontSize: CHART_TICK.fontSize, fontWeight: CHART_TICK.fontWeight }} />
            <YAxis width={62} domain={axisScale.domain} ticks={axisScale.ticks} tickFormatter={(value) => axisNumber(Number(value))} axisLine={false} tickLine={false} tick={CHART_TICK} />
            <ReferenceLine y={0} stroke="#819275" />
            <Tooltip isAnimationActive={false} cursor={{ fill: '#254f3d0a' }} content={(props) => <ChartInfo {...props} format={(value) => chartNumber.format(displayChartValue(value))} unit={chartUnit} />} />

            <Bar dataKey="value" name={title} maxBarSize={84} radius={[4, 4, 0, 0]} isAnimationActive={false}>
              {chartPoints.map((point) => <Cell key={point.group} fill={point.color} />)}
              <LabelList dataKey="value" position="top" formatter={(value) => value === null ? '' : chartNumber.format(displayChartValue(Number(value)))} style={{ fontFamily: 'inherit', fontSize: 'var(--chart-axis-size)', fontWeight: 700, fill: '#30472d' }} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div> : <p className="comparison-no-data">{text.noData}</p>}
      {chartPoints.length > 0 && <ChartSeriesLegend language={language} legendTitle={language === 'vi' ? 'Chú giải:' : 'Legend:'} label={language === 'vi' ? 'Mô hình' : 'Model'} items={points.map((point) => ({ key: point.group, label: point.label, color: point.color, kind: 'bar' }))} />}
      <dl className="comparison-values">{points.map((point) => <div key={point.group}>
        <dt>{point.label}</dt>
        <dd>{point.value === null ? <span>{text.unavailable}</span> : <><strong>{number.format(point.value)}</strong>{' '}<span>{unit}</span></>}</dd>
      </div>)}</dl>
    </article>
  )
}
