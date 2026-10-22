import { Bar, BarChart, CartesianGrid, Cell, LabelList, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
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
  const text = comparisonText[language]
  const currency = language === 'vi' ? 'VND' : 'USD'
  const money = economicMetricUnits[metric] === 'moneyUnit'
  const unit = money ? t.moneyUnit : metric === 'yield' ? t.yieldUnit : t.laborUnit
  const number = new Intl.NumberFormat(language, { minimumFractionDigits: money && language === 'vi' ? 0 : 2, maximumFractionDigits: money && language === 'vi' ? 0 : 2 })
  const compact = new Intl.NumberFormat(language, { notation: 'compact', maximumFractionDigits: 1 })
  const points = (['bau', 'oneMha'] as const).map((group) => ({ group, label: t[group], value: cohort.groups[group][currency][metric], color: group === 'oneMha' ? '#2f8050' : '#bf554c' }))
  const title = text[metric]

  return (
    <article className="comparison-chart-card" aria-labelledby={`comparison-${metric}-title`}>
      <header><h2 id={`comparison-${metric}-title`}>{title}</h2><p>{t.unit}: <strong>{unit}</strong><span>{text.average} {startYear}–{endYear}</span></p></header>
      {points.some((point) => point.value !== null) ? <div className="comparison-plot" role="group" aria-label={`${title} · ${startYear}–${endYear} · ${unit}`}>
        <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 600, height: 280 }}>
          <BarChart data={points} accessibilityLayer margin={{ top: 28, right: 20, bottom: 8, left: 0 }} barCategoryGap="30%">
            <CartesianGrid vertical={false} stroke="#b5c2aa" />
            <XAxis dataKey="label" axisLine={{ stroke: '#819275' }} tickLine={false} tick={{ fontSize: 11, fill: '#52654a' }} tickMargin={12} interval={0} height={40} />
            <YAxis width={62} domain={[(min: number) => min < 0 ? min * 1.15 : 0, (max: number) => max > 0 ? max * 1.2 : 1]} tickFormatter={(value) => compact.format(Number(value))} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#52654a' }} />
            <ReferenceLine y={0} stroke="#819275" />
            <Tooltip isAnimationActive={false} cursor={{ fill: '#254f3d0a' }} formatter={(value) => [`${number.format(Number(value))} ${unit}`, title]} contentStyle={{ background: '#fffefa', border: '1px solid #c5d1bc', borderRadius: 7, fontSize: 12, lineHeight: 1.7 }} wrapperStyle={{ maxWidth: 'min(300px, 85vw)', whiteSpace: 'normal' }} />
            <Bar dataKey="value" name={title} maxBarSize={84} radius={[4, 4, 0, 0]} isAnimationActive={false}>
              {points.map((point) => <Cell key={point.group} fill={point.color} />)}
              <LabelList dataKey="value" position="top" formatter={(value) => value === null ? '' : number.format(Number(value))} style={{ fontFamily: 'inherit', fontSize: 12, fontWeight: 600, fill: '#30472d' }} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div> : <p className="comparison-no-data">{text.noData}</p>}
      <dl className="comparison-values">{points.map((point) => <div key={point.group}>
        <dt><span className={`comparison-swatch ${point.group}`} aria-hidden="true" />{point.label}</dt>
        <dd>{point.value === null ? <span>{text.unavailable}</span> : <><strong>{number.format(point.value)}</strong>{' '}<span>{unit}</span></>}</dd>
      </div>)}</dl>
    </article>
  )
}
