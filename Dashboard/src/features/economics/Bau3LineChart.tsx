import { useState } from 'react'
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { Language } from '../../i18n'
import { yearTicks } from '../../utils/yearTicks'
import { bau3Conditions } from './bau3Types'
import type { Bau3Condition, Bau3Data, Bau3Family, Bau3Metric } from './bau3Types'
import { bau3Unit, formatBau3Value, selectBau3Points } from './bau3Analysis'
import { bau3Text } from './bau3Text'
import ChartLegend from '../../components/ChartLegend'

const conditionColors: Record<Bau3Condition, string> = {
  severeShortage: '#3478c6',
  severeNormal: '#9362bc',
  mildShortage: '#ce762b',
  mildNormal: '#589044',
}

export default function Bau3LineChart({ data, family, metric, domain, language, title }: {
  data: Bau3Data
  family: Bau3Family
  metric: Bau3Metric
  domain: [number, number]
  language: Language
  title?: string
}) {
  const [chartWidth, setChartWidth] = useState(620)
  const [selection, setSelection] = useState<Bau3Condition | 'all'>('all')
  const visibleConditions = selection === 'all' ? bau3Conditions : [selection]
  const t = bau3Text[language]
  const currency = language === 'vi' ? 'VND' : 'USD'
  const points = selectBau3Points(data, family, metric, currency)
  const unit = bau3Unit(metric, language)
  const compact = new Intl.NumberFormat(language, { notation: 'compact', maximumFractionDigits: 1 })
  const ticks = yearTicks(data.startYear, data.endYear, chartWidth, 88)
  const overlap = bau3Conditions.some((first, index) => bau3Conditions.slice(index + 1).some((second) => points.some((point) => point[first] !== null && point[second] !== null) && points.every((point) => point[first] === null && point[second] === null || point[first] !== null && point[second] !== null && Math.abs(point[first] - point[second]) < .000001)))
  const hasData = points.some((point) => visibleConditions.some((condition) => point[condition] !== null))
  return (
    <article className={`bau3-chart bau3-chart-${family}`} aria-labelledby={`bau3-${metric}-${family}-title`}>
      <header><h3 id={`bau3-${metric}-${family}-title`} title={family === 'oneMha' ? t.oneMhaDescription : undefined}>{title ?? t[family]}</h3><p>{t.unit}: <strong>{unit}</strong></p></header>
      <ChartLegend language={language} label={language === 'vi' ? 'Chọn điều kiện kịch bản' : 'Choose scenario conditions'} items={bau3Conditions.map((key) => ({ key, label: t[key], color: conditionColors[key] }))} selected={selection} onSelect={setSelection} allLabel={language === 'vi' ? 'Tất cả điều kiện' : 'All conditions'} />
      {hasData ? <div className="bau3-plot" role="group" aria-label={`${t[metric]} · ${t[family]} · ${data.startYear}–${data.endYear} · ${unit}`}>
        <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 620, height: 310 }} onResize={setChartWidth}>
          <LineChart data={points} accessibilityLayer margin={{ top: 12, right: 20, left: 0, bottom: 8 }}>
            <CartesianGrid stroke="#b5c2aa" strokeWidth={1} />
            <XAxis dataKey="year" type="number" domain={[data.startYear, data.endYear]} ticks={ticks} interval={0} allowDecimals={false} tickLine={false} tickMargin={10} axisLine={{ stroke: '#819275' }} tick={{ fill: '#52654a', fontSize: 11 }} />
            <YAxis width={68} domain={domain} allowDataOverflow tickFormatter={(value) => `${compact.format(Number(value))}${metric === 'margin' ? '%' : ''}`} tickLine={false} tickMargin={8} axisLine={{ stroke: '#819275' }} tick={{ fill: '#52654a', fontSize: 11 }} />
            {domain[0] <= 0 && domain[1] >= 0 && <ReferenceLine y={0} stroke="#819275" />}
            <Tooltip shared isAnimationActive={false} labelFormatter={(year) => `${t.year} ${year}`} formatter={(value) => `${formatBau3Value(Number(value), metric, language)} ${unit}`} contentStyle={{ background: '#fffefa', border: '1px solid #c5d1bc', borderRadius: 7, fontSize: 11, lineHeight: 1.7 }} wrapperStyle={{ maxWidth: 'min(340px, 86vw)', whiteSpace: 'normal' }} cursor={{ stroke: '#819275' }} />
            {visibleConditions.map((condition) => <Line key={condition} type="linear" strokeDasharray={family === 'oneMha' ? undefined : '6 4'} dataKey={condition} name={t[condition]} stroke={conditionColors[condition]} strokeWidth={2.3} dot={{ r: 2.6, fill: conditionColors[condition], stroke: '#fffefa', strokeWidth: .6 }} activeDot={{ r: 4.5, stroke: '#fffefa', strokeWidth: 1.5 }} connectNulls={false} isAnimationActive={false} />)}
          </LineChart>
        </ResponsiveContainer>
      </div> : <p className="bau3-no-data">{t.noData}</p>}
      <p className="bau3-chart-note">{selection === 'all' && overlap ? t.overlap : `${data.startYear}–${data.endYear}`}</p>
    </article>
  )
}
