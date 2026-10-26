import { useState } from 'react'
import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import ChartLegend from '../../components/ChartLegend'
import type { Language } from '../../i18n'
import type { ResourceData, ResourceMetric, ResourceSeries } from './resourceTypes'
import { resourceNumber, resourceStats, resourceUnit } from './resourceAnalysis'
import { resourceText } from './resourceText'

export default function ResourceBarChart({ data, series, metric, language }: { data: ResourceData; series: ResourceSeries[]; metric: ResourceMetric; language: Language }) {
  const t = resourceText[language], unit = resourceUnit(metric, language)
  const [selection, setSelection] = useState<'bau' | 'oneMha' | 'all'>('all')
  const points = (['bau', 'oneMha'] as const).map((group) => ({ group, label: t[group], value: resourceStats(series.filter((item) => (item.family === 'oneMha') === (group === 'oneMha')), metric, data.startYear, data.endYear).mean, color: group === 'oneMha' ? '#2f8050' : '#bf554c' }))
  const visiblePoints = points.filter((point) => selection === 'all' || point.group === selection)
  return <article className="comparison-chart-card" aria-labelledby={`resource-bar-${metric}-title`}>
    <header><h2 id={`resource-bar-${metric}-title`}>{t[metric]}</h2><p>{t.unit}: <strong>{unit}</strong><span>{t.period} {data.startYear} - {data.endYear}</span></p></header>
    <ChartLegend language={language} label={language === 'vi' ? 'Chọn nhóm kịch bản' : 'Choose scenario group'} items={points.map((point) => ({ key: point.group, label: point.label, color: point.color }))} selected={selection} onSelect={setSelection} />
    {visiblePoints.some((point) => point.value !== null) ? <div className="comparison-plot" role="group" aria-label={`${t[metric]} · ${unit}`}><ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 600, height: 280 }}>
      <BarChart data={visiblePoints} accessibilityLayer margin={{ top: 28, right: 20, bottom: 8, left: 0 }} barCategoryGap="30%">
        <CartesianGrid vertical={false} stroke="#b5c2aa" />
        <XAxis dataKey="label" axisLine={{ stroke: '#819275' }} tickLine={false} tick={{ fontSize: 11, fill: '#52654a' }} tickMargin={12} interval={0} height={40} />
        <YAxis width={62} domain={[(min: number) => Math.min(0, min * 1.15), (max: number) => max > 0 ? max * 1.2 : 1]} tickFormatter={(value) => new Intl.NumberFormat(language, { maximumFractionDigits: 1 }).format(Number(value))} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#52654a' }} />
        <Tooltip isAnimationActive={false} cursor={{ fill: '#254f3d0a' }} formatter={(value) => [`${resourceNumber(Number(value), language)} ${unit}`, t[metric]]} contentStyle={{ background: '#fffefa', border: '1px solid #c5d1bc', borderRadius: 7, fontSize: 12 }} />
        <Bar dataKey="value" name={t[metric]} maxBarSize={84} radius={[4, 4, 0, 0]} isAnimationActive={false}>
          {visiblePoints.map((point) => <Cell key={point.group} fill={point.color} />)}
          <LabelList dataKey="value" position="top" formatter={(value) => value === null ? '' : resourceNumber(Number(value), language)} style={{ fontFamily: 'inherit', fontSize: 12, fontWeight: 600, fill: '#30472d' }} />
        </Bar>
      </BarChart>
    </ResponsiveContainer></div> : <p className="comparison-no-data">{t.noData}</p>}
    <dl className="comparison-values">{visiblePoints.map((point) => <div key={point.group}><dt><span className={`comparison-swatch ${point.group}`} aria-hidden="true" />{point.label}</dt><dd>{point.value === null ? '—' : <><strong>{resourceNumber(point.value, language)}</strong> <span>{unit}</span></>}</dd></div>)}</dl>
  </article>
}
