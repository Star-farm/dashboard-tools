import ChartMarker from './ChartMarker'
import ChartUnitLabel from './ChartUnitLabel'
import { CHART_TICK, CONDITION_COLORS, CONDITION_MARKERS, scenarioLineStyle } from './chartStyles'
import { useId, useState } from 'react'
import { Bar, CartesianGrid, LabelList, Line, ComposedChart, ReferenceLine, ResponsiveContainer, XAxis, YAxis } from 'recharts'
import type { Language } from '../i18n'
import { yearTicks } from '../utils/yearTicks'
import { lineAxisScale } from '../utils/lineAxisScale'
import { distinctAxisFormatter } from '../utils/distinctAxisFormatter'
import { zeroBasedAxisScale } from '../utils/zeroBasedAxisScale'
import { bau3Conditions } from '../features/economics/bau3Types'
import type { Bau3Condition } from '../features/economics/bau3Types'
import { bau3Text } from '../features/economics/bau3Text'
import ConditionFilters, { ConditionLegend } from './ConditionFilters'
import { useConditionFilters } from './useConditionFilters'
import '../styles/scenario-comparison-chart.css'
import { useChartSelection } from './chartSelectionContext'

type ConditionPoint = { year: number } & Record<Bau3Condition, number | null>
interface Props {
  language: Language
  chartType?: 'line' | 'bar'
  title: string
  baselineLabel: string
  baseline: ConditionPoint[]
  oneMha: ConditionPoint[]
  startYear: number
  endYear: number
  domain: [number, number]
  unit: string
  formatValue: (value: number) => string
  formatAxis?: (value: number, ticks: number[]) => string
}

export default function ScenarioComparisonChart({ language, title, baselineLabel, baseline, oneMha, startYear, endYear, domain, unit, formatValue, formatAxis, chartType = 'line' }: Props) {
  const bars = chartType === 'bar'
  const id = useId()
  const [width, setWidth] = useState(620)
  const filters = useConditionFilters()
  const [model, setModel] = useChartSelection<'all' | 'bau' | 'oneMha'>('model', 'all')
  const [year, setYear] = useState(startYear)
  const t = bau3Text[language]
  const vi = language === 'vi'
  const visible = filters.visible
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
  const lineScale = lineAxisScale(points.flatMap((point) => visibleModels.flatMap((group) => visible.map((key) => point[`${group}_${key}`]))))
  const barScale = zeroBasedAxisScale(points.flatMap((point) => visibleModels.flatMap((group) => visible.map((key) => point[`${group}_${key}`]))))
  const axisNumber = distinctAxisFormatter(lineScale.ticks, language, true)
  const barAxisNumber = distinctAxisFormatter(barScale.ticks, language, true)
  const selectedYear = Math.min(endYear, Math.max(startYear, year))
  const display = (value: number | null | undefined) => value == null ? '—' : formatValue(value)
  const selectYear = ({ activeLabel }: { activeLabel?: string | number }) => {
    const value = Number(activeLabel)
    if (activeLabel != null && Number.isInteger(value) && value >= startYear && value <= endYear) setYear(value)
  }
  return <article className="bau3-chart scenario-comparison-chart" aria-labelledby={`${id}-title`}>
    <header><h3 id={`${id}-title`}><span className="scenario-model-bau">{baselineLabel}</span> <span> / </span> <span className="scenario-model-one-mha">1Mha</span></h3></header>
    <div className="comparison-model-key" data-chart={chartType} role="group" aria-label={vi ? 'Chọn mô hình so sánh' : 'Choose comparison models'}>
      <p className="chart-legend-label">{vi ? 'Chọn mô hình so sánh' : 'Choose comparison models'}</p>
      <button type="button" title={vi ? 'Tất cả mô hình' : 'All models'} aria-pressed={model === 'all'} onClick={() => setModel('all')}>{vi ? 'Tất cả mô hình' : 'All models'}</button>
      <button type="button" title="1Mha" aria-pressed={model === 'oneMha'} onClick={() => setModel('oneMha')}><i className="model-line model-line-oneMha" aria-hidden="true" />1Mha · {bars ? vi ? 'cột đậm' : 'solid bars' : vi ? 'nét đậm' : 'bold line'}</button>
      <button type="button" title={baselineLabel} aria-pressed={model === 'bau'} onClick={() => setModel('bau')}><i className="model-line model-line-bau" aria-hidden="true" />{baselineLabel} · {bars ? vi ? 'cột nhạt' : 'faint bars' : vi ? 'nét đứt' : 'dashed line'}</button>
    </div>
    <ConditionFilters language={language} filters={filters} />
    {hasData ? <>
      <div className="bau3-plot comparison-combined-plot" role="group" tabIndex={0} aria-label={`${title} · ${baselineLabel} / 1Mha · ${startYear}–${endYear} · ${unit}`} onKeyDownCapture={(event) => {
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
        event.preventDefault()
        event.stopPropagation()
        setYear(event.key === 'Home' ? startYear : event.key === 'End' ? endYear : Math.min(endYear, Math.max(startYear, selectedYear + (event.key === 'ArrowRight' ? 1 : -1))))
      }}>
        <ChartUnitLabel unit={unit} language={language} />
        <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 620, height: 340 }} onResize={setWidth}>
          <ComposedChart barGap={1} barCategoryGap="10%" data={points} accessibilityLayer margin={{ top: 30, right: 18, left: 0, bottom: 8 }} onClick={selectYear}>
            <CartesianGrid stroke="#b5c2aa" strokeWidth={1} />
            <XAxis dataKey="year" type={bars ? 'category' : 'number'} domain={bars ? undefined : [startYear, endYear]} ticks={yearTicks(startYear, endYear, width, 88)} interval={0} allowDecimals={false} tickLine={false} tickMargin={10} axisLine={{ stroke: '#819275' }} tick={CHART_TICK} />
            <YAxis width={width < 420 ? 46 : 68} domain={bars ? barScale.domain : lineScale.domain} ticks={bars ? barScale.ticks : lineScale.ticks} allowDataOverflow tickFormatter={(value) => bars ? barAxisNumber(Number(value)) : formatAxis ? formatAxis(Number(value), lineScale.ticks) : axisNumber(Number(value))} tickLine={false} tickMargin={width < 420 ? 4 : 6} axisLine={{ stroke: '#819275' }} tick={CHART_TICK} />
            {domain[0] <= 0 && domain[1] >= 0 && <ReferenceLine y={0} stroke="#819275" />}
            <ReferenceLine x={selectedYear} stroke="#687a5c" strokeWidth={1} />
            {bars ? visibleModels.flatMap((group) => visible.map((key) => <Bar key={group+'_'+key} dataKey={group+'_'+key} name={(group === 'bau' ? baselineLabel : '1Mha')+' · '+t[key]} fill={CONDITION_COLORS[key]} fillOpacity={group === 'bau' ? .35 : 1} stroke={CONDITION_COLORS[key]} strokeDasharray={group === 'bau' ? '3 2' : undefined} maxBarSize={20} isAnimationActive={false}><LabelList dataKey={group+'_'+key} position="top" formatter={(amount) => amount == null ? '' : formatValue(Number(amount))} style={{ fill: '#30472d', fontSize: 13, fontWeight: 700 }} /></Bar>)) : visibleModels.flatMap((group) => visible.map((key) => <Line key={`${group}_${key}`} type="linear" dataKey={`${group}_${key}`} name={`${group === 'bau' ? baselineLabel : '1Mha'} · ${t[key]}`} {...scenarioLineStyle(group, key, true, visibleModels.length === 1, true)} connectNulls={false} isAnimationActive={false} />))}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      {visible.length * visibleModels.length > 1 && <div className="comparison-year-details">
        <p className="comparison-selected-year">{t.year} <strong>{selectedYear}</strong></p>
        <table className="comparison-year-values" aria-label={`${title} · ${t.year} ${selectedYear} · ${unit}`}>
          <thead><tr><th scope="col">{vi ? 'Điều kiện kịch bản' : 'Scenario conditions'}</th>{model !== 'oneMha' && <th scope="col">{baselineLabel}</th>}{model !== 'bau' && <th scope="col">1Mha</th>}</tr></thead>
          <tbody>{visible.map((key) => <tr key={key}><th scope="row"><svg className="condition-marker" viewBox="-7 -7 14 14" aria-hidden="true"><ChartMarker shape={CONDITION_MARKERS[key]} color={CONDITION_COLORS[key]} /></svg>{t[key]}</th>{model !== 'oneMha' && <td>{display(baselineYears.get(selectedYear)?.[key])}</td>}{model !== 'bau' && <td><strong>{display(oneMhaYears.get(selectedYear)?.[key])}</strong></td>}</tr>)}</tbody>
        </table>
      </div>}
      {visible.length * visibleModels.length === 1 && <p className="sr-only" aria-live="polite">{t.year} {selectedYear} · {t[visible[0]]} · {visibleModels[0] === 'bau' ? baselineLabel : '1Mha'}: {display((visibleModels[0] === 'bau' ? baselineYears : oneMhaYears).get(selectedYear)?.[visible[0]])} {unit}</p>}
    </> : <p className="bau3-no-data">{t.noData}</p>}
    <ConditionLegend language={language} conditions={filters.visible} />
    <p className="bau3-chart-note">{bars ? vi ? 'Màu cột thể hiện điều kiện kịch bản. BAU: cột nhạt, viền đứt. 1Mha: cột đậm.' : 'Bar colors identify scenario conditions. BAU: faint bars with dashed borders. 1Mha: solid bars.' : vi ? 'Màu và hình dấu điểm thể hiện điều kiện kịch bản. BAU: nét đứt. 1Mha: nét liền. Các đường có cùng số liệu có thể trùng nhau.' : 'Colors and marker shapes identify scenario conditions. BAU: dashed. 1Mha: solid. Lines with identical values may overlap.'}</p>
  </article>
}
