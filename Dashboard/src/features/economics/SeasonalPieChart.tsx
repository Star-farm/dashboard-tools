import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts'
import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import type { Language } from '../../i18n'
import type { CropPeriod } from './seasonalData'
import { seasonalComposition } from './seasonalComposition'
import ScenarioAbbreviations from '../../components/ScenarioAbbreviations'

const cropColors: Record<CropPeriod, string> = { early: '#267e91', middle: '#ba861f', late: '#8859a5' }
export interface SeasonalSlice { period: CropPeriod; label: string; value: number | null; status?: string; notGrown?: boolean }

export default function SeasonalPieChart({ language, name, color, slices, unit, format, mobileFormat, selected, onSelect, showLegend = true, allowedPeriods }: {
  language: Language
  name: string
  color: string
  slices: SeasonalSlice[]
  unit: string
  format: (value: number) => string
  mobileFormat?: (value: number) => string
  selected: string
  onSelect?: (period: CropPeriod) => void
  showLegend?: boolean
  allowedPeriods?: readonly CropPeriod[]
}) {
  const vi = language === 'vi'
  const [hovered, setHovered] = useState<CropPeriod | null>(null)
  const [pinned, setPinned] = useState<CropPeriod | null>(null)
  const [hoverPointer, setHoverPointer] = useState(() => typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(hover: hover) and (pointer: fine)').matches)
  const [pointer, setPointer] = useState<{ x: number; y: number }>()
  const [tooltipPosition, setTooltipPosition] = useState<{ left: number; top: number }>()
  const instanceId = useId()
  const tooltipRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return
    const query = window.matchMedia('(hover: hover) and (pointer: fine)')
    const update = (event: MediaQueryListEvent) => setHoverPointer(event.matches)
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])
  useEffect(() => {
    if (!hoverPointer) return
    const updateHoveredPie = (event: PointerEvent) => {
      const canvas = canvasRef.current
      const target = event.target instanceof Element ? event.target : null
      const sector = target?.closest('[data-pie-period]')
      const period = canvas && sector && canvas.contains(sector) ? sector.getAttribute('data-pie-period') : null
      const activePeriod = period === 'early' || period === 'middle' || period === 'late' ? period : null
      setHovered(activePeriod)
      setPointer(activePeriod ? { x: event.clientX, y: event.clientY } : undefined)
    }
    document.addEventListener('pointermove', updateHoveredPie)
    return () => document.removeEventListener('pointermove', updateHoveredPie)
  }, [hoverPointer])
  useEffect(() => {
    const closeOtherTooltip = (event: Event) => {
      if ((event as CustomEvent<string>).detail === instanceId) return
      setPinned(null)
      setHovered(null)
    }
    window.addEventListener('seasonal-pie-tooltip-open', closeOtherTooltip)
    return () => window.removeEventListener('seasonal-pie-tooltip-open', closeOtherTooltip)
  }, [instanceId])
  const normalizedSlices = slices.map((slice) => ({ ...slice, value: slice.value ?? 0 }))
  const cultivated = normalizedSlices.filter((slice) => !slice.notGrown && (!allowedPeriods || allowedPeriods.includes(slice.period)))
  const { shares } = seasonalComposition(cultivated.map((slice) => slice.value))
  const percent = (slice: typeof cultivated[number]) => {
    const index = cultivated.indexOf(slice)
    return shares && index >= 0 ? `${new Intl.NumberFormat(language, { maximumFractionDigits: 1 }).format(shares[index])} %` : null
  }
  const tooltipPercent = (slice: typeof cultivated[number]) => {
    const index = cultivated.indexOf(slice)
    return shares && index >= 0 ? `${new Intl.NumberFormat(language, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(shares[index])} %` : null
  }
  const mobileNumber = mobileFormat ?? ((value: number) => new Intl.NumberFormat(language, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value))
  const dataLabel = (slice: typeof cultivated[number]) => percent(slice)?.replace(/\s?%$/, '') ?? ''
  const description = (slice: typeof cultivated[number]) => `${slice.label}: ${format(slice.value)} ${unit}${percent(slice) ? ` · ${percent(slice)}` : ''}`
  const negative = normalizedSlices.some((slice) => slice.value !== null && slice.value < 0)
  const positive = normalizedSlices.filter((slice) => slice.value !== null && slice.value > 0)
  const drawable = shares !== null && !negative && positive.length > 0
  const active = normalizedSlices.find((slice) => slice.period === (hovered ?? (hoverPointer ? null : pinned)) && slice.value !== 0)
  function select(period: CropPeriod) {
    onSelect?.(period)
    if (!hoverPointer) {
      if (pinned === period) {
        setPinned(null)
        return
      }
      setPinned(period)
      window.dispatchEvent(new CustomEvent('seasonal-pie-tooltip-open', { detail: instanceId }))
    }
  }
  useLayoutEffect(() => {
    const tooltip = tooltipRef.current
    if (!hoverPointer || !hovered || !pointer || !tooltip) {
      setTooltipPosition(undefined)
      return
    }
    const gap = 14, margin = 8
    const { width, height } = tooltip.getBoundingClientRect()
    let left = pointer.x + gap
    if (left + width > window.innerWidth - margin) left = pointer.x - width - gap
    left = Math.max(margin, Math.min(left, window.innerWidth - width - margin))
    let top = pointer.y + gap
    if (top + height > window.innerHeight - margin) top = pointer.y - height - gap
    top = Math.max(margin, Math.min(top, window.innerHeight - height - margin))
    setTooltipPosition((current) => current?.left === left && current.top === top ? current : { left, top })
  }, [hoverPointer, hovered, pointer, active?.period])
  return <figure className="seasonal-pie">
    <figcaption style={{ color }}><ScenarioAbbreviations text={name} language={language} /></figcaption>
    <div ref={canvasRef} className="seasonal-pie-canvas" role="group" tabIndex={0} aria-label={`${name}: ${normalizedSlices.filter((slice) => slice.value !== 0).map(description).join('; ')}`} onMouseMove={(event) => {
      if (!hoverPointer) return
      setPointer({ x: event.clientX, y: event.clientY })
      const period = (event.target as Element).closest('[data-pie-period]')?.getAttribute('data-pie-period')
      setHovered(period === 'early' || period === 'middle' || period === 'late' ? period : null)
    }} onMouseLeave={() => { setHovered(null); setPointer(undefined) }} onKeyDown={(event) => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
      event.preventDefault(); event.stopPropagation()
      const index = Math.max(0, slices.findIndex((slice) => slice.period === (pinned ?? selected)))
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? slices.length - 1 : Math.max(0, Math.min(slices.length - 1, index + (event.key === 'ArrowRight' ? 1 : -1)))
      select(slices[next].period)
    }}>
      <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 300, height: 300 }}>
        <PieChart>
          <Pie data={drawable ? positive : [{ label: '', value: 1, period: 'early' }]} dataKey="value" nameKey="label" cx="50%" cy="50%" innerRadius="48%" outerRadius="85%" startAngle={90} endAngle={-270} paddingAngle={drawable && positive.length > 1 ? 3 : 0} stroke="#fffefa" strokeWidth={2} isAnimationActive={false} labelLine={false} label={drawable ? (props) => {
            const angle = -Number(props.midAngle) * Math.PI / 180
            const radius = (Number(props.innerRadius) + Number(props.outerRadius)) / 2
            const slice = positive.find((item) => item.period === props.payload?.period)
            return <text x={Number(props.cx) + radius * Math.cos(angle)} y={Number(props.cy) + radius * Math.sin(angle)} textAnchor="middle" dominantBaseline="central" fill="#fff" stroke="#173e32" strokeWidth={2.5} paintOrder="stroke" fontWeight={700} fontSize={14} pointerEvents="none">{slice ? dataLabel(slice) : ''}</text>
          } : false}>
            {(drawable ? positive : [null]).map((slice) => <Cell key={slice?.period ?? 'empty'} data-pie-period={slice?.period} fill={slice ? cropColors[slice.period] : '#dce3d9'} opacity={slice && selected !== slice.period ? .8 : 1} cursor={slice ? 'pointer' : 'default'} strokeWidth={slice?.period === selected ? 4 : 2} onClick={() => { if (slice) select(slice.period) }} />)}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    </div>
    {active && <div ref={tooltipRef} className={`chart-info seasonal-pie-tooltip${hoverPointer && hovered && pointer ? ' seasonal-pie-tooltip--pointer' : ''}`} style={hoverPointer && hovered && pointer ? { left: tooltipPosition?.left ?? pointer.x + 14, top: tooltipPosition?.top ?? pointer.y + 14 } : undefined} role="status"><p className="chart-info-title"><span className="seasonal-pie-tooltip-name"><ScenarioAbbreviations text={active.label} language={language} /></span></p><dl><div><dt><span className="chart-info-swatch" style={{ backgroundColor: cropColors[active.period] }} aria-hidden="true" /><span>{active.value === null ? active.status : <><span className="seasonal-pie-tooltip-desktop-value">{format(active.value)}</span><span className="seasonal-pie-tooltip-mobile-value">{mobileNumber(active.value)}</span> <span className="seasonal-pie-tooltip-unit">{unit}</span></>}{tooltipPercent(active) && <><span className="seasonal-pie-tooltip-desktop-percent"> · {tooltipPercent(active)}</span><span className="seasonal-pie-tooltip-mobile-percent"> · {tooltipPercent(active)}</span></>}</span></dt></div></dl></div>}

    {showLegend && <div
      className="seasonal-model-legend seasonal-pie-shared-legend"
      role="group"
      aria-label={vi ? 'Chú giải mùa vụ' : 'Season legend'}
    >
      <p className="chart-legend-label">{vi ? 'Chú giải:' : 'Legend:'}</p>
      {cultivated.map((slice) => (
        <span key={slice.period} className="seasonal-model-legend-item seasonal-pie-shared-legend-item">
          <span
            className="seasonal-model-legend-swatch"
            style={{
              backgroundColor: cropColors[slice.period],
              width: 12,
              height: 12,
              borderRadius: 3,
            }}
            aria-hidden="true"
          />
          <span>{slice.label}</span>
        </span>
      ))}
    </div>}

    {negative && <p className="seasonal-pie-note">{vi ? 'Có giá trị âm, không thể hiện cơ cấu: ' : 'Negative values cannot be shown as shares: '}{normalizedSlices.map(description).join('; ')}</p>}
    {!negative && !drawable && <p className="seasonal-pie-note">{vi ? 'Không tính cơ cấu khi thiếu dữ liệu hoặc tổng bằng 0.' : 'Composition is unavailable with missing data or a zero total.'} {cultivated.map(description).join('; ')}</p>}
    {drawable && normalizedSlices.some(
      (slice) => !slice.notGrown &&
        (slice.value === null || slice.value === 0)
    ) && (
      <p className="seasonal-pie-note">
        {normalizedSlices
          .filter(
            (slice) => !slice.notGrown &&
              (slice.value === null || slice.value === 0)
          )
          .map(description)
          .join('; ')}
      </p>
    )}
  </figure>
}
