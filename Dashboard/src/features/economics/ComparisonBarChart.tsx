import { CHART_TICK, CHART_TOOLTIP, scenarioColor } from '../../components/chartStyles'
import { useState } from 'react'
import { Bar, BarChart, CartesianGrid, Cell, LabelList, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import ChartLegend from '../../components/ChartLegend'
import type { Language } from '../../i18n'
import type { ComparisonCohort, ComparisonMetric } from './comparisonData'
import { economicMetricUnits, economicsText } from './economicsText'
import { comparisonText } from './comparisonText'

export default function ComparisonBarChart({ metric, cohort, language, startYear, endYear }: {
  metric: ComparisonMetric
  cohort: ComparisonCohort
  language: Language
  startYear: number
  endYear: number
}) {
  const t = economicsText[language]
  const [selection, setSelection] = useState<'bau' | 'oneMha' | 'all'>('all')
  const text = comparisonText[language]
  const currency = language === 'vi' ? 'VND' : 'USD'
  const money = economicMetricUnits[metric] === 'moneyUnit'
  const unit = money ? t.moneyUnit : metric === 'yield' ? t.yieldUnit : t.laborUnit
  const number = new Intl.NumberFormat(language, { minimumFractionDigits: money && language === 'vi' ? 0 : 2, maximumFractionDigits: money && language === 'vi' ? 0 : 2 })
  const compact = new Intl.NumberFormat(language, { notation: 'compact', maximumFractionDigits: 1 })
  const points = (['bau', 'oneMha'] as const).map((group) => ({ group, label: t[group], value: cohort.groups[group][currency][metric], color: scenarioColor(group) }))
  const title = text[metric]
  const visiblePoints = points.filter((point) => selection === 'all' || point.group === selection)

  return (
    <article className="comparison-chart-card" aria-labelledby={`comparison-${metric}-title`}>
      <header><h2 id={`comparison-${metric}-title`}>{title}</h2><p>{t.unit}: <strong>{unit}</strong><span>{text.period} {startYear} - {endYear}</span></p></header>
      <ChartLegend language={language} label={language === 'vi' ? 'Chọn nhóm kịch bản' : 'Choose scenario group'} items={points.map((point) => ({ key: point.group, label: point.label, color: point.color }))} selected={selection} onSelect={setSelection} />
      {visiblePoints.some((point) => point.value !== null) ? <div className="comparison-plot" role="group" aria-label={`${title} · ${startYear}–${endYear} · ${unit}`}>
        <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 600, height: 280 }}>
          <BarChart data={visiblePoints} accessibilityLayer margin={{ top: 28, right: 20, bottom: 8, left: 0 }} barCategoryGap="30%">
            <CartesianGrid vertical={false} stroke="#b5c2aa" />
            <XAxis dataKey="label" axisLine={{ stroke: '#819275' }} tickLine={false} tick={CHART_TICK} tickMargin={12} interval={0} height={48} />
            <YAxis width={62} domain={[(min: number) => min < 0 ? min * 1.15 : 0, (max: number) => max > 0 ? max * 1.2 : 1]} tickFormatter={(value) => compact.format(Number(value))} axisLine={false} tickLine={false} tick={CHART_TICK} />
            <ReferenceLine y={0} stroke="#819275" />
            <Tooltip isAnimationActive={false} cursor={{ fill: '#254f3d0a' }} formatter={(value) => [`${number.format(Number(value))} ${unit}`, title]} contentStyle={CHART_TOOLTIP} wrapperStyle={{ maxWidth: 'min(300px, 85vw)', whiteSpace: 'normal' }} />
            <Bar dataKey="value" name={title} maxBarSize={84} radius={[4, 4, 0, 0]} isAnimationActive={false}>
              {visiblePoints.map((point) => <Cell key={point.group} fill={point.color} />)}
              <LabelList dataKey="value" position="top" formatter={(value) => value === null ? '' : number.format(Number(value))} style={{ fontFamily: 'inherit', fontSize: 'var(--chart-axis-size)', fontWeight: 700, fill: '#30472d' }} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div> : <p className="comparison-no-data">{text.noData}</p>}
      <dl className="comparison-values">{visiblePoints.map((point) => <div key={point.group}>
        <dt><span className={`comparison-swatch ${point.group}`} aria-hidden="true" />{point.label}</dt>
        <dd>{point.value === null ? <span>{text.unavailable}</span> : <><strong>{number.format(point.value)}</strong>{' '}<span>{unit}</span></>}</dd>
      </div>)}</dl>
    </article>
  )
}
