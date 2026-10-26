import { useId, useState } from 'react'
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { Language } from '../i18n'
import { yearTicks } from '../utils/yearTicks'
import { bau3Conditions } from '../features/economics/bau3Types'
import type { Bau3Condition } from '../features/economics/bau3Types'
import { bau3Text } from '../features/economics/bau3Text'
import ChartLegend from './ChartLegend'
import '../styles/scenario-comparison-chart.css'

type ConditionPoint = { year: number } & Record<Bau3Condition, number | null>
const conditionColors = { severeShortage: '#3478c6', severeNormal: '#9362bc', mildShortage: '#ce762b', mildNormal: '#589044' }
interface Props {
  language: Language
  title: string
  baselineLabel: string
  baseline: ConditionPoint[]
  oneMha: ConditionPoint[]
  startYear: number
  endYear: number
  domain: [number, number]
  unit: string
  colors?: Record<Bau3Condition, string>
  formatValue: (value: number) => string
  formatAxis?: (value: number) => string
}

export default function ScenarioComparisonChart({ language, title, baselineLabel, baseline, oneMha, startYear, endYear, domain, unit, colors = conditionColors, formatValue, formatAxis }: Props) {
  const id = useId()
  const [width, setWidth] = useState(620)
  const [condition, setCondition] = useState<Bau3Condition | 'all'>('all')
  const [model, setModel] = useState<'all' | 'bau' | 'oneMha'>('all')
  const [year, setYear] = useState(startYear)
  const t = bau3Text[language]
  const vi = language === 'vi'
  const visible = condition === 'all' ? bau3Conditions : [condition]
  const visibleModels = (['bau', 'oneMha'] as const).filter((key) => model === 'all' || model === key)
  const baselineYears = new Map(baseline.map((point) => [point.year, point]))
  const oneMhaYears = new Map(oneMha.map((point) => [point.year, point]))
  const points: ({ year: number } & Record<string, number | null>)[] = Array.from({ length: endYear - startYear + 1 }, (_, index) => {
    const currentYear = startYear + index
    return {
      year: currentYear,
      ...Object.fromEntries(bau3Conditions.flatMap((key) => [
        [`bau_${key}`, baselineYears.get(currentYear)?.[key] ?? null],
        [`oneMha_${key}`, oneMhaYears.get(currentYear)?.[key] ?? null],
      ])),
    }
  })
  const hasData = points.some((point) => visible.some((key) => visibleModels.some((group) => point[`${group}_${key}`] != null)))
  const selectedYear = Math.min(endYear, Math.max(startYear, year))
  const display = (value: number | null | undefined) => value == null ? '—' : formatValue(value)
  const selectYear = ({ activeLabel }: { activeLabel?: string | number }) => {
    const value = Number(activeLabel)
    if (activeLabel != null && Number.isInteger(value) && value >= startYear && value <= endYear) setYear(value)
  }
  const compact = new Intl.NumberFormat(language, { notation: 'compact', maximumFractionDigits: 1 })
  return <article className="bau3-chart scenario-comparison-chart" aria-labelledby={`${id}-title`}>
    <header><h3 id={`${id}-title`}>{baselineLabel} <span> / </span> 1Mha</h3><p>{t.unit}: <strong>{unit}</strong></p></header>
    <div className="comparison-model-key" role="group" aria-label={vi ? 'Chọn mô hình so sánh' : 'Choose comparison models'}>
      <button type="button" aria-pressed={model === 'all'} onClick={() => setModel('all')}>{vi ? 'Tất cả mô hình' : 'All models'}</button>
      <button type="button" aria-pressed={model === 'oneMha'} onClick={() => setModel('oneMha')}><i className="model-line model-line-oneMha" aria-hidden="true" />1Mha · {vi ? 'nét đậm' : 'bold line'}</button>
      <button type="button" aria-pressed={model === 'bau'} onClick={() => setModel('bau')}><i className="model-line model-line-bau" aria-hidden="true" />{baselineLabel} · {vi ? 'nét đứt nhạt' : 'faint dashed line'}</button>
    </div>
    <ChartLegend language={language} label={vi ? 'Chọn điều kiện kịch bản' : 'Choose scenario conditions'} items={bau3Conditions.map((key) => ({ key, label: t[key], color: colors[key] }))} selected={condition} onSelect={setCondition} allLabel={vi ? 'Tất cả điều kiện' : 'All conditions'} />
    {hasData ? <>
      <div className="bau3-plot comparison-combined-plot" role="group" tabIndex={0} aria-describedby={`${id}-hint`} aria-label={`${title} · ${baselineLabel} / 1Mha · ${startYear}–${endYear} · ${unit}`} onKeyDownCapture={(event) => {
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
        event.preventDefault()
        event.stopPropagation()
        setYear(event.key === 'Home' ? startYear : event.key === 'End' ? endYear : Math.min(endYear, Math.max(startYear, selectedYear + (event.key === 'ArrowRight' ? 1 : -1))))
      }}>
        <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 620, height: 340 }} onResize={setWidth}>
          <LineChart data={points} accessibilityLayer margin={{ top: 14, right: 18, left: 0, bottom: 8 }} onClick={selectYear}>
            <CartesianGrid stroke="#b5c2aa" strokeWidth={1} />
            <XAxis dataKey="year" type="number" domain={[startYear, endYear]} ticks={yearTicks(startYear, endYear, width, 88)} interval={0} allowDecimals={false} tickLine={false} tickMargin={10} axisLine={{ stroke: '#819275' }} tick={{ fill: '#52654a', fontSize: 11 }} />
            <YAxis width={width < 420 ? 56 : 68} domain={domain} allowDataOverflow tickFormatter={(value) => formatAxis ? formatAxis(Number(value)) : compact.format(Number(value))} tickLine={false} tickMargin={6} axisLine={{ stroke: '#819275' }} tick={{ fill: '#52654a', fontSize: 11 }} />
            {domain[0] <= 0 && domain[1] >= 0 && <ReferenceLine y={0} stroke="#819275" />}
            <ReferenceLine x={selectedYear} stroke="#687a5c" strokeWidth={1} />
            <Tooltip trigger="click" content={() => null} cursor={false} isAnimationActive={false} />
            {visibleModels.flatMap((group) => visible.map((key) => <Line key={`${group}_${key}`} type="linear" dataKey={`${group}_${key}`} name={`${group === 'bau' ? baselineLabel : '1Mha'} · ${t[key]}`} stroke={colors[key]} strokeDasharray={group === 'bau' ? '6 4' : undefined} strokeOpacity={group === 'bau' ? .42 : 1} strokeWidth={group === 'bau' ? 1.8 : 2.8} dot={{ r: group === 'bau' ? 2.2 : 3, fill: colors[key], fillOpacity: group === 'bau' ? .42 : 1, stroke: group === 'bau' ? colors[key] : '#fffefa', strokeOpacity: group === 'bau' ? .42 : 1, strokeWidth: .6 }} activeDot={{ r: group === 'bau' ? 4 : 5, stroke: '#fffefa', strokeWidth: 1.5 }} connectNulls={false} isAnimationActive={false} />))}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="comparison-year-hint" id={`${id}-hint`}>{vi ? 'Bấm hoặc chạm vào biểu đồ để xem năm và số liệu.' : 'Click or tap the chart to view the year and values.'}</p>
      <div className="comparison-year-details">
        <p className="comparison-selected-year">{t.year} <strong>{selectedYear}</strong></p>
        <table className="comparison-year-values" aria-label={`${title} · ${t.year} ${selectedYear} · ${unit}`}>
          <thead><tr><th scope="col">{vi ? 'Điều kiện kịch bản' : 'Scenario conditions'}</th>{model !== 'oneMha' && <th scope="col">{baselineLabel}</th>}{model !== 'bau' && <th scope="col">1Mha</th>}</tr></thead>
          <tbody>{visible.map((key) => <tr key={key}><th scope="row"><i style={{ background: colors[key] }} aria-hidden="true" />{t[key]}</th>{model !== 'oneMha' && <td>{display(baselineYears.get(selectedYear)?.[key])}</td>}{model !== 'bau' && <td><strong>{display(oneMhaYears.get(selectedYear)?.[key])}</strong></td>}</tr>)}</tbody>
        </table>
      </div>
    </> : <p className="bau3-no-data">{t.noData}</p>}
    <p className="bau3-chart-note">{vi ? 'Cùng màu: cùng điều kiện kịch bản. Các đường có cùng số liệu có thể trùng nhau.' : 'Matching colors indicate matching conditions. Lines with identical values may overlap.'}</p>
  </article>
}
