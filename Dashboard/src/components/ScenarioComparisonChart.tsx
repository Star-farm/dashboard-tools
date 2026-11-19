import ConditionComparisonTooltip from './ConditionComparisonTooltip'
import ChartUnitLabel from './ChartUnitLabel'
import { CHART_TICK, scenarioColor, scenarioLineStyle } from './chartStyles'
import { useId, useState } from 'react'
import { Bar, CartesianGrid, LabelList, Line, ComposedChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
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
import ScenarioAbbreviations from './ScenarioAbbreviations'
import ChartSeriesLegend from './ChartSeriesLegend'

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
  const allValues = points.flatMap((point) => (['bau', 'oneMha'] as const).flatMap((group) => bau3Conditions.map((key) => point[`${group}_${key}`])))
  const lineScale = lineAxisScale(allValues)
  const barScale = zeroBasedAxisScale(allValues)
  const axisNumber = distinctAxisFormatter(lineScale.ticks, language, true)
  const barAxisNumber = distinctAxisFormatter(barScale.ticks, language, true)
  const selectedYear = Math.min(endYear, Math.max(startYear, year))
  const display = (value: number | null | undefined) => value == null ? '—' : formatValue(value)
  const selectYear = ({ activeLabel }: { activeLabel?: string | number }) => {
    const value = Number(activeLabel)
    if (activeLabel != null && Number.isInteger(value) && value >= startYear && value <= endYear) setYear(value)
  }
  return <article className="bau3-chart scenario-comparison-chart" aria-labelledby={`${id}-title`}>
    <header><h3 id={`${id}-title`}><span className="scenario-model-bau"><ScenarioAbbreviations text={baselineLabel} language={language} /></span> <span> / </span> <span className="scenario-model-one-mha"><ScenarioAbbreviations text="1Mha" language={language} /></span></h3></header>
    <div className="comparison-model-key" data-chart={chartType} role="group" aria-label={vi ? 'Chọn mô hình so sánh' : 'Choose comparison models'}>
      <p className="chart-legend-label">{vi ? 'Chọn mô hình so sánh' : 'Choose comparison models'}</p>
      <button type="button" title={vi ? 'Tất cả mô hình' : 'All models'} aria-pressed={model === 'all'} onClick={() => setModel('all')}>{vi ? 'Tất cả mô hình' : 'All models'}</button>
      <button type="button" aria-pressed={model === 'oneMha'} onClick={() => setModel('oneMha')}><ScenarioAbbreviations text="1Mha" language={language} /></button>
      <button type="button" aria-pressed={model === 'bau'} onClick={() => setModel('bau')}><ScenarioAbbreviations text={baselineLabel} language={language} /></button>
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
          <ComposedChart barGap={1} barCategoryGap="10%" data={points} accessibilityLayer margin={{ top: 30, right: 18, left: 0, bottom: 24 }} onClick={selectYear}>
            <CartesianGrid stroke="#b5c2aa" strokeWidth={1} />
            <XAxis dataKey="year" type={bars ? 'category' : 'number'} domain={bars ? undefined : [startYear, endYear]} ticks={yearTicks(startYear, endYear, width, 88)} interval={0} allowDecimals={false} tickLine={false} tickMargin={10} axisLine={{ stroke: '#819275' }} tick={CHART_TICK} label={{ value: t.year, position: 'insideBottom', offset: -18, fill: CHART_TICK.fill, fontSize: CHART_TICK.fontSize, fontWeight: CHART_TICK.fontWeight }} />
            <YAxis width={width < 420 ? 46 : 68} domain={bars ? barScale.domain : lineScale.domain} ticks={bars ? barScale.ticks : lineScale.ticks} allowDataOverflow tickFormatter={(value) => bars ? barAxisNumber(Number(value)) : formatAxis ? formatAxis(Number(value), lineScale.ticks) : axisNumber(Number(value))} tickLine={false} tickMargin={width < 420 ? 4 : 6} axisLine={{ stroke: '#819275' }} tick={CHART_TICK} />
            {domain[0] <= 0 && domain[1] >= 0 && <ReferenceLine y={0} stroke="#819275" />}
            <Tooltip shared isAnimationActive={false} content={(tooltipProps) => <ConditionComparisonTooltip {...tooltipProps} language={language} yearLabel={t.year} format={formatValue} unit={unit} />} cursor={{ stroke: '#819275', strokeDasharray: '3 3' }} wrapperStyle={{ pointerEvents: 'none', zIndex: 10 }} />
            <ReferenceLine x={selectedYear} stroke="#687a5c" strokeWidth={1} />
            {bars ? visibleModels.flatMap((group) => visible.map((key) => <Bar key={group+'_'+key} dataKey={group+'_'+key} name={(group === 'bau' ? baselineLabel : '1Mha')+' · '+t[key]} fill={scenarioColor(group)} stroke={scenarioColor(group)} maxBarSize={20} isAnimationActive={false}><LabelList dataKey={group+'_'+key} position="top" formatter={(amount) => amount == null ? '' : formatValue(Number(amount))} style={{ fill: '#30472d', fontSize: 13, fontWeight: 700 }} /></Bar>)) : visibleModels.flatMap((group) => visible.map((key) => <Line key={`${group}_${key}`} type="linear" dataKey={`${group}_${key}`} name={`${group === 'bau' ? baselineLabel : '1Mha'} · ${t[key]}`} {...scenarioLineStyle(group, key)} connectNulls={false} isAnimationActive={false} />))}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      {visible.length * visibleModels.length === 1 && <p className="sr-only" aria-live="polite">{t.year} {selectedYear} · {t[visible[0]]} · {visibleModels[0] === 'bau' ? baselineLabel : '1Mha'}: {display((visibleModels[0] === 'bau' ? baselineYears : oneMhaYears).get(selectedYear)?.[visible[0]])} {unit}</p>}
    </> : <p className="bau3-no-data">{t.noData}</p>}
    {hasData && <section className="scenario-encoding-legend" aria-label={vi ? 'Chú giải biểu đồ' : 'Chart legend'}>
      <p className="chart-legend-caption">{vi ? 'Chú giải:' : 'Legend:'}</p>
      <div className="scenario-encoding-legend-groups">
        <ChartSeriesLegend language={language} label={vi ? 'Mô hình' : 'Model'} items={[
          { key: 'oneMha', label: '1Mha', color: scenarioColor('oneMha'), kind: 'bar' },
          { key: 'bau', label: baselineLabel, color: scenarioColor('bau'), kind: 'bar' },
        ]} />
        <ConditionLegend language={language} conditions={filters.visible} />
      </div>
    </section>}
  </article>
}
