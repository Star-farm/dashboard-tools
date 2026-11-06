import { CHART_TICK, scenarioColor, scenarioLineStyle } from '../../components/chartStyles'
import { useId, useState } from 'react'
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { Language } from '../../i18n'
import ChartLegend from '../../components/ChartLegend'
import { yearTicks } from '../../utils/yearTicks'
import { bau3Conditions } from './bau3Types'
import type { Bau3Condition } from './bau3Types'
import { bau3Text } from './bau3Text'
import { cropPeriods, cultivatedPeriods, seasonalMetricGroups } from './seasonalData'
import type { CropPeriod, SeasonalConfig, SeasonalData, SeasonalFamily, SeasonalMetric, SeasonalRow } from './seasonalData'
import { seasonalText } from './seasonalText'
import { seasonalChange, seasonalLabel, seasonalNumber, seasonalUnit } from './seasonalFormatting'
import SeasonalOverview from './SeasonalOverview'
import SeasonalPieChart from './SeasonalPieChart'
import { averageSeasonalYears } from './seasonalYearAverage'
import type { SeasonalYear } from './seasonalYearAverage'
import '../../styles/seasonal-comparison.css'

type Point = { key: string; period: CropPeriod; rows: Partial<Record<SeasonalFamily, SeasonalRow>> }
type Mode = 'year' | 'trend'
const isNotGrown = (family: SeasonalFamily, point: Point) => !cultivatedPeriods(family).includes(point.period)

export default function SeasonalComparison({ language, data, config }: { language: Language; data: SeasonalData; config: SeasonalConfig }) {
  const t = seasonalText[language]
  const [mode, setMode] = useState<Mode>('year'), [year, setYear] = useState<SeasonalYear>('all')
  const [period, setPeriod] = useState<CropPeriod>('early'), [condition, setCondition] = useState<Bau3Condition>('mildNormal')
  const [baseline, setBaseline] = useState<SeasonalFamily>(config.family ?? 'bau3s')
  const scoped = config.scenarioCode ? data.rows.filter((row) => row.code === config.scenarioCode) : data.rows
  const selectedCondition = config.scenarioCode ? scoped[0]?.condition ?? condition : condition
  const rows = scoped.filter((row) => row.condition === selectedCondition)
  const selectedRows = mode === 'year' && year === 'all' ? averageSeasonalYears(rows) : rows
  const families: SeasonalFamily[] = config.kind === 'family' ? [config.family ?? baseline] : [config.family ?? baseline, 'oneMha']
  const metrics = config.metrics ?? seasonalMetricGroups[config.topic]
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
      {config.kind !== 'overview' && !config.scenarioCode && <label className="seasonal-condition">{t.condition}<select title={t.condition} value={condition} onChange={(event) => setCondition(event.target.value as Bau3Condition)}>{bau3Conditions.map((value) => <option key={value} value={value}>{bau3Text[language][value]}</option>)}</select></label>}
      {config.kind === 'comparison' && !config.family && <label>{t.baseline}<select title={t.baseline} value={baseline} onChange={(event) => setBaseline(event.target.value as SeasonalFamily)}>{(['bau3s', 'bau2s', 'bauss'] as const).map((family) => <option key={family} value={family}>{t[family]}</option>)}</select></label>}
    </div>
    {config.kind === 'overview' ? <SeasonalOverview data={data} metrics={metrics} language={language} mode={mode} year={year} period={period} /> : <>
      <aside className="seasonal-context" aria-label={t.summary}><strong>{mode === 'year' ? year === 'all' ? `${t.allYears} · ${data.startYear}–${data.endYear}` : `${t.year} ${year}` : `${t[period]} · ${data.startYear}–${data.endYear}`}</strong><p>{families.map((family) => t[family]).join(' / ')} · {bau3Text[language][selectedCondition]}</p><p>{config.kind === 'comparison' ? `${t.common} ` : ''}{t.notGrownNote}</p></aside>
      <div className="seasonal-grid">{metrics.map((metric) => <SeasonalMetricCard key={`${metric}-${mode}-${year}-${period}-${selectedCondition}-${baseline}`} language={language} metric={metric} points={points} mode={mode} families={families} startYear={data.startYear} endYear={data.endYear} />)}</div>
    </>}
  </section>
}

function SeasonalMetricCard({ language, metric, points, mode, families, startYear, endYear }: { language: Language; metric: SeasonalMetric; points: Point[]; mode: Mode; families: SeasonalFamily[]; startYear: number; endYear: number }) {
  const t = seasonalText[language], id = useId(), title = seasonalLabel(metric, language)
  const [selected, setSelected] = useState(points[0].key), [model, setModel] = useState<SeasonalFamily | 'all'>('all'), [width, setWidth] = useState(620)
  const currency = language === 'vi' ? 'VND' : 'USD', unit = seasonalUnit(metric, language)
  const visible = families.filter((family) => model === 'all' || family === model)
  const value = (point: Point, family: SeasonalFamily) => isNotGrown(family, point) ? null : point.rows[family]?.[currency][metric]?.mean ?? null
  const plotted = visible.filter((family) => points.some((point) => value(point, family) !== null))
  const format = (number: number) => seasonalNumber(number, metric, language)
  const label = (key: string) => mode === 'year' ? t[key as CropPeriod] : key
  const chartData = points.map((point) => ({ key: point.key, ...Object.fromEntries(families.map((family) => [family, value(point, family)])) }))
  const current = points.find((point) => point.key === selected) ?? points[0]
  const hasData = plotted.length > 0
  const pairs = families.length === 2 ? points.flatMap((point) => {
    const bau = value(point, families[0]), one = value(point, families[1])
    return bau === null || one === null ? [] : [{ key: point.key, bau, one }]
  }) : []
  const differences = mode === 'year' ? pairs.map((pair) => ({ label: label(pair.key), ...pair })) : pairs.length ? [{ label: `${startYear}–${endYear}`, bau: pairs.reduce((sum, pair) => sum + pair.bau, 0) / pairs.length, one: pairs.reduce((sum, pair) => sum + pair.one, 0) / pairs.length }] : []
  const selectedValues = points.flatMap((point) => { const amount = value(point, families[0]); return amount === null ? [] : [{ label: label(point.key), amount }] })
  const sorted = [...selectedValues].sort((a, b) => a.amount - b.amount), low = sorted[0], high = sorted.at(-1)
  const selectPoint = ({ activeLabel }: { activeLabel?: number | string }) => { if (activeLabel != null && points.some((point) => point.key === String(activeLabel))) setSelected(String(activeLabel)) }
  const grid = <CartesianGrid stroke="#d8dfd0" vertical={false} />
  const axes = <><XAxis dataKey="key" ticks={mode === 'trend' ? yearTicks(startYear, endYear, width, 80).map(String) : undefined} interval={0} tickFormatter={label} tick={CHART_TICK} tickLine={false} axisLine={{ stroke: '#819275' }} tickMargin={10} /><YAxis width={width < 420 ? 48 : 62} tickFormatter={(amount) => new Intl.NumberFormat(language, { notation: 'compact', maximumFractionDigits: 1 }).format(Number(amount))} tick={CHART_TICK} axisLine={false} tickLine={false} /></>
  const tooltip = <Tooltip trigger="click" content={() => null} cursor={false} isAnimationActive={false} />
  const singleChange = selectedValues.length ? seasonalChange(selectedValues[0].amount, selectedValues.at(-1)!.amount, metric, language) : null
  return <article className="seasonal-card" aria-labelledby={`${id}-title`}>
    <header><h3 id={`${id}-title`}>{title}</h3><p>{t.average} · <strong>{unit}</strong></p></header>
    {families.length > 1 && <ChartLegend language={language} label={`${t.modelFilter} · ${title}`} items={families.map((family) => ({ key: family, label: t[family], color: scenarioColor(family), dashed: family !== 'oneMha' && mode === 'trend' }))} selected={model} onSelect={setModel} allLabel={t.allModels} />}
    {hasData ? <div className={`seasonal-plot${mode === 'year' ? ' seasonal-pie-plot' : ''}`} role="group" aria-label={title} aria-describedby={`${id}-hint`} tabIndex={0} onKeyDownCapture={(event) => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
      event.preventDefault()
      event.stopPropagation()
      const index = points.findIndex((point) => point.key === current.key)
      setSelected(points[event.key === 'Home' ? 0 : event.key === 'End' ? points.length - 1 : Math.max(0, Math.min(points.length - 1, index + (event.key === 'ArrowRight' ? 1 : -1)))].key)
    }}>{mode === 'year' ? <div className="seasonal-pies">{visible.map((family) => <SeasonalPieChart key={family} language={language} name={t[family]} color={scenarioColor(family)} slices={points.map((point) => ({ period: point.period, label: label(point.key), value: value(point, family), status: isNotGrown(family, point) ? t.notGrown : t.noData }))} unit={unit} format={format} selected={current.key} onSelect={setSelected} />)}</div> : <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 620, height: 280 }} onResize={setWidth}>
      <LineChart data={chartData} accessibilityLayer margin={{ top: 16, right: 14, bottom: 10, left: 0 }} onClick={selectPoint}>
        {grid}{axes}{tooltip}<ReferenceLine x={current.key} stroke="#829074" strokeDasharray="3 3" />{plotted.map((family) => <Line key={family} dataKey={family} name={t[family]} type="linear" {...scenarioLineStyle(family)} connectNulls={false} isAnimationActive={false} />)}
      </LineChart>
    </ResponsiveContainer>}</div> : <p className="seasonal-empty">{visible.every((family) => isNotGrown(family, current)) ? t.notGrown : t.noData}</p>}
    <p className="seasonal-hint" id={`${id}-hint`}>{t.hint}{mode === 'year' && (language === 'vi' ? ' Lát cắt so sánh giá trị giữa các vụ, không biểu thị tỷ trọng trong tổng năm.' : ' Slices compare seasonal values; they do not represent shares of an annual total.')}</p>
    <section className="seasonal-values" aria-label={`${t.selected} · ${title}`} aria-live="polite"><h4>{mode === 'trend' ? `${t.year} ` : ''}{label(current.key)}</h4><dl data-single={visible.length === 1}>{visible.map((family) => {
      const amount = value(current, family)
      return <div key={family}><dt><i style={{ background: scenarioColor(family) }} aria-hidden="true" />{t[family]}</dt><dd>{amount !== null ? <strong>{format(amount)} <small>{unit}</small></strong> : <span className="seasonal-missing">{isNotGrown(family, current) ? t.notGrown : t.noData}</span>}</dd></div>
    })}</dl></section>
    <aside className="seasonal-insight" aria-label={`${t.insight} · ${title}`}><h4>{t.insight}</h4>
      {families.length === 1 ? !low || !high ? <p>{points.every((point) => isNotGrown(families[0], point)) ? t.notGrown : t.noData}</p> : mode === 'trend' && singleChange ? <p>{t.trend} ({selectedValues[0].label}–{selectedValues.at(-1)!.label}): <strong className={`scenario-change ${singleChange.tone}`}>{singleChange.text}</strong>.</p> : <p>{t.highest}: {high.label} ({format(high.amount)} {unit}); {t.lowest}: {low.label} ({format(low.amount)} {unit}).</p>
        : !differences.length ? <p>{points.every((point) => families.some((family) => isNotGrown(family, point))) ? t.notGrownNote : t.noPair}</p> : <><p>{mode === 'year' ? `${t.comparison} ${t[families[0]]}:` : `${t.periodMean}:`}</p><ul>{differences.map((pair) => {
          const change = seasonalChange(pair.bau, pair.one, metric, language)
          return <li key={pair.label}>{pair.label}: <strong className={`scenario-change ${change.tone}`}>{change.text}</strong>.</li>
        })}</ul></>}
    </aside>
  </article>
}
