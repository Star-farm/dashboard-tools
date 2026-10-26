import { useState } from 'react'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { Language } from '../../i18n'
import { yearTicks } from '../../utils/yearTicks'
import { bau3Conditions } from '../economics/bau3Types'
import type { Bau3Condition, Bau3Family } from '../economics/bau3Types'
import { bau3Text } from '../economics/bau3Text'
import type { EnvironmentData, EnvironmentMetric } from './environmentTypes'
import { environmentColors, environmentLinePoints, environmentNumber, environmentUnit } from './environmentAnalysis'
import { environmentText } from './environmentText'
import ChartLegend from '../../components/ChartLegend'

export default function EnvironmentLineChart({ data, family, metric, domain, language, title }: { data: EnvironmentData; family: Bau3Family; metric: EnvironmentMetric; domain: [number, number]; language: Language; title?: string }) {
  const [width, setWidth] = useState(620)
  const [selection, setSelection] = useState<Bau3Condition | 'all'>('all')
  const visibleConditions = selection === 'all' ? bau3Conditions : [selection]
  const t = environmentText[language], labels = bau3Text[language], points = environmentLinePoints(data, family, metric), unit = environmentUnit(metric, language)
  const overlap = bau3Conditions.some((first, index) => bau3Conditions.slice(index + 1).some((second) => points.some((point) => point[first] != null && point[second] != null) && points.every((point) => point[first] == null && point[second] == null || point[first] != null && point[second] != null && Math.abs(Number(point[first]) - Number(point[second])) < .000001)))
  const hasData = points.some((point) => visibleConditions.some((condition) => point[condition] != null))
  return <article className={`bau3-chart bau3-chart-${family}`} aria-labelledby={`environment-${metric}-${family}-title`}>
    <header><h3 id={`environment-${metric}-${family}-title`}>{title ?? t[family]}</h3><p>{t.unit}: <strong>{unit}</strong></p></header>
    <ChartLegend language={language} label={language === 'vi' ? 'Chọn điều kiện kịch bản' : 'Choose scenario conditions'} items={bau3Conditions.map((key) => ({ key, label: labels[key], color: environmentColors[key] }))} selected={selection} onSelect={setSelection} allLabel={language === 'vi' ? 'Tất cả điều kiện' : 'All conditions'} />
    {hasData ? <div className="bau3-plot" role="group" aria-label={`${t[metric]} · ${t[family]} · ${unit}`}><ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 620, height: 310 }} onResize={setWidth}>
      <LineChart data={points} accessibilityLayer margin={{ top: 12, right: 20, left: 0, bottom: 8 }}>
        <CartesianGrid stroke="#b5c2aa" strokeWidth={1} />
        <XAxis dataKey="year" type="number" domain={[data.startYear, data.endYear]} ticks={yearTicks(data.startYear, data.endYear, width, 88)} interval={0} allowDecimals={false} tickLine={false} tickMargin={10} axisLine={{ stroke: '#819275' }} tick={{ fill: '#52654a', fontSize: 11 }} />
        <YAxis width={68} domain={domain} allowDataOverflow tickFormatter={(value) => new Intl.NumberFormat(language, { maximumFractionDigits: 1 }).format(Number(value))} tickLine={false} tickMargin={8} axisLine={{ stroke: '#819275' }} tick={{ fill: '#52654a', fontSize: 11 }} />
        <Tooltip shared isAnimationActive={false} labelFormatter={(year) => `${t.year} ${year}`} formatter={(value) => `${environmentNumber(Number(value), language)} ${unit}`} contentStyle={{ background: '#fffefa', border: '1px solid #c5d1bc', borderRadius: 7, fontSize: 11, lineHeight: 1.7 }} wrapperStyle={{ maxWidth: 'min(340px, 86vw)', whiteSpace: 'normal' }} cursor={{ stroke: '#819275' }} />
        {visibleConditions.map((condition) => <Line key={condition} type="linear" strokeDasharray={family === 'oneMha' ? undefined : '6 4'} dataKey={condition} name={labels[condition]} stroke={environmentColors[condition]} strokeWidth={2.3} dot={{ r: 2.6, fill: environmentColors[condition], stroke: '#fffefa', strokeWidth: .6 }} activeDot={{ r: 4.5, stroke: '#fffefa', strokeWidth: 1.5 }} connectNulls={false} isAnimationActive={false} />)}
      </LineChart>
    </ResponsiveContainer></div> : <p className="bau3-no-data">{t.noData}</p>}
    <p className="bau3-chart-note">{selection === 'all' && overlap ? labels.overlap : `${data.startYear}–${data.endYear}`}</p>
  </article>
}
