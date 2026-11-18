import { CHART_TICK, scenarioColor, scenarioLineStyle } from '../../components/chartStyles'
import ChartUnitLabel from '../../components/ChartUnitLabel'
import ChartInfo from '../../components/ChartInfo'
import { Fragment, useId, useState } from 'react'
import { Bar, CartesianGrid, LabelList, Line, ComposedChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { Language } from '../../i18n'
import { readMapContext } from '../../app/mapNavigation'
import ChartLegend from '../../components/ChartLegend'
import { useChartSelection } from '../../components/chartSelectionContext'
import { yearTicks } from '../../utils/yearTicks'
import { distinctAxisFormatter } from '../../utils/distinctAxisFormatter'
import { zeroBasedAxisScale } from '../../utils/zeroBasedAxisScale'
import type { Bau3Condition } from './bau3Types'
import { economicsText } from './economicsText'
import { cropPeriods, cultivatedPeriods, seasonalMetricGroups } from './seasonalData'
import type { CropPeriod, SeasonalConfig, SeasonalData, SeasonalFamily, SeasonalMetric, SeasonalRow } from './seasonalData'

const cropPeriodColors: Record<CropPeriod, string> = { early: '#267e91', middle: '#ba861f', late: '#8859a5' }
import { seasonalText } from './seasonalText'
import { seasonalChartUnit, seasonalLabel, seasonalNumber, seasonalUnit } from './seasonalFormatting'
import SeasonalOverview from './SeasonalOverview'
import SeasonalPieChart from './SeasonalPieChart'
import SeasonalYearInsight from './SeasonalYearInsight'
import SeasonalTrendInsight from './SeasonalTrendInsight'
import { averageSeasonalYears } from './seasonalYearAverage'
import type { SeasonalYear } from './seasonalYearAverage'
import { lineAxisScale } from '../../utils/lineAxisScale'
import '../../styles/seasonal-comparison.css'

type Point = { key: string; period: CropPeriod; rows: Partial<Record<SeasonalFamily, SeasonalRow>> }
type Mode = 'year' | 'trend'
const isNotGrown = (family: SeasonalFamily, point: Point) => !cultivatedPeriods(family).includes(point.period)

export default function SeasonalComparison({ language, data, config }: { language: Language; data: SeasonalData; config: SeasonalConfig }) {
  const t = seasonalText[language]
  const context = readMapContext()
  const [mode, setMode] = useState<Mode>('year'), [year, setYear] = useState<SeasonalYear>(() => context?.year ?? 'all')
  const [period, setPeriod] = useState<CropPeriod>(() => context?.harvest ? cropPeriods[context.harvest - 1] : 'early'), [condition, setCondition] = useState<Bau3Condition>('mildNormal')
  const baseline: SeasonalFamily = config.family ?? (config.kind === 'comparison' ? 'bau' : 'bau3s')
  const scoped = config.scenarioCode ? data.rows.filter((row) => row.code === config.scenarioCode) : data.rows
  const selectedCondition = config.scenarioCode ? scoped[0]?.condition ?? condition : condition
  const rows = scoped.filter((row) => row.condition === selectedCondition)
  const selectedRows = mode === 'year' && year === 'all' ? averageSeasonalYears(rows) : rows
  const families: SeasonalFamily[] = config.kind === 'family' ? [config.family ?? baseline] : [config.family ?? baseline, 'oneMha']
  const metrics = config.metrics ?? seasonalMetricGroups[config.topic]
  const chartType = (metric: SeasonalMetric) => mode === 'trend' ? 'line' : ['roi', 'margin'].includes(metric) ? 'bar' : 'pie'
  const chartOrder = { bar: 0, pie: 1, line: 2 }
  const orderedMetrics = metrics.filter((metric) => mode !== 'year' || metric !== 'awd').sort((a, b) => chartOrder[chartType(a)] - chartOrder[chartType(b)])
  const chartLabels = language === 'vi' ? { bar: 'Biểu đồ cột', pie: 'Biểu đồ quạt', line: 'Biểu đồ đường' } : { bar: 'Bar charts', pie: 'Doughnut charts', line: 'Line charts' }
  const years = Array.from({ length: data.endYear - data.startYear + 1 }, (_, index) => data.startYear + index)
  const points: Point[] = (mode === 'year' ? cropPeriods : years).map((value) => ({
    key: String(value), period: mode === 'year' ? value as CropPeriod : period,
    rows: Object.fromEntries(families.map((family) => [family, selectedRows.find((row) => row.family === family && (mode === 'year' ? (year === 'all' || row.year === year) && row.period === value : row.year === value && row.period === period))])),
  }))
  return <section className="seasonal-comparison" aria-labelledby="seasonal-title">
    <header className="seasonal-intro"><div><h2 id="seasonal-title">{t.title}</h2><p>{t.description}</p></div></header>
    <div className="seasonal-controls" role="group" aria-labelledby="seasonal-filters-title">
      <h3 id="seasonal-filters-title" className="seasonal-filters-title">{t.filters}</h3>
      <fieldset><legend>{t.view}</legend><div className="seasonal-mode"><button type="button" title={t.withinYear} aria-pressed={mode === 'year'} onClick={() => setMode('year')}>{t.withinYear}</button><button type="button" title={t.overTime} aria-pressed={mode === 'trend'} onClick={() => setMode('trend')}>{t.overTime}</button></div></fieldset>
      {mode === 'year' ? <label>{t.year}<select title={t.year} value={year} onChange={(event) => setYear(event.target.value === 'all' ? 'all' : Number(event.target.value))}><option value="all">{t.allYears}</option>{years.map((value) => <option key={value} value={value}>{value}</option>)}</select></label> : <label>{t.period}<select title={t.period} value={period} onChange={(event) => setPeriod(event.target.value as CropPeriod)}>{cropPeriods.map((value) => <option key={value} value={value}>{t[value]}</option>)}</select></label>}
      {config.kind === 'overview' && context?.harvest && mode === 'year' ? <label>{t.period}<select title={t.period} value={period} onChange={(event) => setPeriod(event.target.value as CropPeriod)}>{cropPeriods.map((value) => <option key={value} value={value}>{t[value]}</option>)}</select></label> : null}
      {config.kind !== 'overview' && !config.scenarioCode && <>
        <label>{economicsText[language].climate}<select title={economicsText[language].climate} value={condition.startsWith('mild') ? 'mild' : 'severe'} onChange={(event) => setCondition(`${event.target.value}${condition.endsWith('Normal') ? 'Normal' : 'Shortage'}` as Bau3Condition)}><option value="mild">{economicsText[language].mild}</option><option value="severe">{economicsText[language].severe}</option></select></label>
        <label>{economicsText[language].resource}<select title={economicsText[language].resource} value={condition.endsWith('Normal') ? 'Normal' : 'Shortage'} onChange={(event) => setCondition(`${condition.startsWith('mild') ? 'mild' : 'severe'}${event.target.value}` as Bau3Condition)}><option value="Normal">{economicsText[language].normal}</option><option value="Shortage">{economicsText[language].shortage}</option></select></label>
      </>}
    </div>
    {config.kind === 'overview' ? <SeasonalOverview data={data} metrics={metrics} language={language} mode={mode} year={year} period={period} singlePeriod={!!context?.harvest} /> : <>
      <div className="seasonal-grid">{orderedMetrics.map((metric, index) => <Fragment key={`${metric}-${mode}-${year}-${period}-${selectedCondition}-${baseline}`}>
        {(index === 0 || chartType(metric) !== chartType(orderedMetrics[index - 1])) && <h3 className="seasonal-chart-type">{chartLabels[chartType(metric)]}</h3>}
        <SeasonalMetricCard language={language} metric={metric} points={points} mode={mode} families={families} startYear={data.startYear} endYear={data.endYear} />
      </Fragment>)}</div>
    </>}
  </section>
}

function SeasonalMetricCard({ language, metric, points, mode, families, startYear, endYear }: { language: Language; metric: SeasonalMetric; points: Point[]; mode: Mode; families: SeasonalFamily[]; startYear: number; endYear: number }) {
  const bars = mode === 'year' && (metric === 'roi' || metric === 'margin')
  const pieMode = mode === 'year' && !bars
  const t = seasonalText[language], id = useId(), metricTitle = seasonalLabel(metric, language)
  const title = pieMode
    ? `${language === 'vi' ? 'Cơ cấu ' : 'Composition '}${metricTitle.charAt(0).toLocaleLowerCase(language)}${metricTitle.slice(1)}`
    : metricTitle
  const [selected, setSelected] = useState(points[0].key), [model, setModel] = useChartSelection<SeasonalFamily | 'all'>('seasonalModel', 'all'), [width, setWidth] = useState(620)
  const currency = language === 'vi' ? 'VND' : 'USD', unit = seasonalUnit(metric, language), chartUnit = seasonalChartUnit(metric, language)
  const visible = families.filter((family) => model === 'all' || family === model)
  const value = (point: Point, family: SeasonalFamily) => isNotGrown(family, point) ? null : point.rows[family]?.[currency][metric]?.mean ?? null
  const plotted = visible.filter((family) => points.some((point) => value(point, family) !== null))
  const format = (number: number) => seasonalNumber(number, metric, language)
  const chartFormat = (number: number) => new Intl.NumberFormat(language, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(number / (language === 'vi' && ['income', 'cost', 'straw'].includes(metric) ? 1_000_000 : 1))
  const mobileChartFormat = (number: number) => new Intl.NumberFormat(language, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(number / (language === 'vi' && ['income', 'cost', 'straw'].includes(metric) ? 1_000_000 : 1))
  const label = (key: string) => mode === 'year' ? t[key as CropPeriod] : key
  const chartData: Array<{ key: string; [key: string]: string | number | null }> = points.map((point) => ({ key: point.key, ...Object.fromEntries(families.map((family) => { const amount = value(point, family); return [family, amount === null ? null : amount / (language === 'vi' && ['income', 'cost', 'straw'].includes(metric) ? 1_000_000 : 1)] })) }))
  const lineScale = lineAxisScale(chartData.flatMap((point) => plotted.map((family) => typeof point[family] === 'number' ? point[family] as number : null)))
  const barScale = zeroBasedAxisScale(chartData.flatMap((point) => plotted.map((family) => typeof point[family] === 'number' ? point[family] as number : null)))
  const axisNumber = distinctAxisFormatter(lineScale.ticks, language, metric !== 'intensity')
  const barAxisNumber = distinctAxisFormatter(barScale.ticks, language, true)
  const current = points.find((point) => point.key === selected) ?? points[0]
  const hasData = plotted.length > 0
  const grid = <CartesianGrid stroke="#d8dfd0" vertical={false} />
  const axes = <><XAxis dataKey="key" ticks={mode === 'trend' ? yearTicks(startYear, endYear, width, 80).map(String) : undefined} interval={0} tickFormatter={label} tick={CHART_TICK} tickLine={false} axisLine={{ stroke: '#819275' }} tickMargin={10} /><YAxis domain={bars ? barScale.domain : lineScale.domain} ticks={bars ? barScale.ticks : lineScale.ticks} width={width < 420 ? 42 : 68} tickFormatter={(amount) => bars ? barAxisNumber(Number(amount)) : axisNumber(Number(amount))} tick={CHART_TICK} axisLine={false} tickLine={false} /></>
  const tooltip = <Tooltip trigger="hover" content={(props) => <ChartInfo {...props} label={mode === 'year' ? label(String(props.label ?? '')) : props.label} yearLabel={mode === 'trend' ? t.year : undefined} format={(amount) => new Intl.NumberFormat(language, { maximumSignificantDigits: 3 }).format(amount)} unit={chartUnit} />} isAnimationActive={false} />
  return <article className="seasonal-card" aria-labelledby={`${id}-title`}>
    <header><h3 id={`${id}-title`}>{title}</h3></header>
    {families.length > 1 && <ChartLegend language={language} label={t.modelFilter} items={families.map((family) => ({ key: family, label: t[family], color: scenarioColor(family) }))} selected={model} onSelect={setModel} allLabel={t.allModels} />}
    {hasData ? <div className={`seasonal-plot${pieMode ? ' seasonal-pie-plot' : ''}`} role="group" aria-label={title} tabIndex={0} onKeyDownCapture={(event) => {
      if (event.target !== event.currentTarget) return
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
      event.preventDefault()
      event.stopPropagation()
      const index = points.findIndex((point) => point.key === current.key)
      setSelected(points[event.key === 'Home' ? 0 : event.key === 'End' ? points.length - 1 : Math.max(0, Math.min(points.length - 1, index + (event.key === 'ArrowRight' ? 1 : -1)))].key)
    }}><ChartUnitLabel unit={pieMode ? '%' : chartUnit} language={language} />{pieMode ? <><div className="seasonal-pies">{visible.map((family) => <SeasonalPieChart key={family} language={language} name={t[family]} color={scenarioColor(family)} slices={points.map((point) => ({ period: point.period, label: label(point.key), value: value(point, family), notGrown: isNotGrown(family, point), status: isNotGrown(family, point) ? t.notGrown : t.noData }))} unit={chartUnit} format={chartFormat} mobileFormat={mobileChartFormat} selected={current.key} showLegend={visible.length === 1} />)}</div>{visible.length > 1 && <div className="seasonal-pie-shared-legend" role="group" aria-label={language === 'vi' ? 'Chú giải màu sắc mùa vụ' : 'Season color legend'}><strong>{language === 'vi' ? 'Chú giải:' : 'Legend:'}</strong>{cropPeriods.map((crop) => <span className="seasonal-pie-shared-legend-item" key={crop}><i aria-hidden="true" style={{ backgroundColor: cropPeriodColors[crop] }} />{t[crop]}</span>)}</div>}</> : <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 620, height: 280 }} onResize={setWidth}>
      <ComposedChart data={chartData} accessibilityLayer margin={{ top: 32, right: 14, bottom: 10, left: 0 }}>
        {grid}{axes}{tooltip}{!bars && <ReferenceLine x={current.key} stroke="#829074" strokeDasharray="3 3" />}{bars ? plotted.map((family) => <Bar key={family} dataKey={family} name={t[family]} fill={scenarioColor(family)} maxBarSize={44} isAnimationActive={false}><LabelList dataKey={family} position="top" offset={family === 'oneMha' ? 28 : 6} formatter={(amount) => amount == null ? '' : new Intl.NumberFormat(language, { maximumFractionDigits: 1 }).format(Number(amount))} style={{ fill: '#30472d', fontSize: 13, fontWeight: 700, fontFamily: 'inherit' }} /></Bar>) : plotted.map((family) => <Line key={family} dataKey={family} name={t[family]} type="linear" {...scenarioLineStyle(family, undefined, false, plotted.length === 1)} connectNulls={false} isAnimationActive={false} />)}
      </ComposedChart>
    </ResponsiveContainer>}</div> : <p className="seasonal-empty">{visible.every((family) => isNotGrown(family, current)) ? t.notGrown : t.noData}</p>}
    <p className="sr-only" aria-live="polite">{mode === 'trend' ? `${t.year} ` : ''}{label(current.key)} · {visible.map((family) => `${t[family]}: ${value(current, family) === null ? isNotGrown(family, current) ? t.notGrown : t.noData : `${format(value(current, family)!)} ${unit}`}`).join('; ')}</p>
    <aside className="seasonal-insight" aria-label={`${t.insight} · ${title}`}><h4>{t.insight}</h4>
      {mode === 'year' ? <SeasonalYearInsight language={language} metric={metric} models={visible.map((family) => ({ family, crops: points.filter((point) => !isNotGrown(family, point)).map((point) => ({ label: label(point.key), value: value(point, family) })) }))} format={format} unit={unit} /> : <SeasonalTrendInsight language={language} metric={metric} startYear={startYear} endYear={endYear} models={plotted.map((family) => ({ family, values: points.map((point) => ({ year: Number(point.key), value: value(point, family) })) }))} />}
    </aside>
  </article>
}
