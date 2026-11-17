import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts'
import { useState } from 'react'
import type { Language } from '../../i18n'
import type { CropPeriod } from './seasonalData'
import { seasonalComposition } from './seasonalComposition'

const cropColors: Record<CropPeriod, string> = { early: '#267e91', middle: '#ba861f', late: '#8859a5' }
export interface SeasonalSlice { period: CropPeriod; label: string; value: number | null; status?: string; notGrown?: boolean }

export default function SeasonalPieChart({ language, name, color, slices, unit, format, selected, onSelect }: {
  language: Language
  name: string
  color: string
  slices: SeasonalSlice[]
  unit: string
  format: (value: number) => string
  selected: string
  onSelect: (period: CropPeriod) => void
}) {
  const vi = language === 'vi'
  const [hovered, setHovered] = useState<CropPeriod | null>(null)
  const [pinned, setPinned] = useState<CropPeriod | null>(null)
  const cultivated = slices.filter((slice) => !slice.notGrown)
  const { shares } = seasonalComposition(cultivated.map((slice) => slice.value))
  const percent = (slice: SeasonalSlice) => {
    const index = cultivated.indexOf(slice)
    return shares && index >= 0 ? `${new Intl.NumberFormat(language, { maximumFractionDigits: 1 }).format(shares[index])}%` : null
  }
  const description = (slice: SeasonalSlice) => `${slice.label}: ${slice.value === null ? slice.status : `${format(slice.value)} ${unit}`}${percent(slice) ? ` · ${percent(slice)}` : ''}`
  const negative = slices.some((slice) => slice.value !== null && slice.value < 0)
  const positive = slices.filter((slice) => slice.value !== null && slice.value > 0)
  const drawable = shares !== null && !negative && positive.length > 0
  const active = slices.find((slice) => slice.period === (hovered ?? pinned))
  function select(period: CropPeriod) { setPinned(period); onSelect(period) }
  return <figure className="seasonal-pie">
    <figcaption style={{ color }}>{name}</figcaption>
    <div className="seasonal-pie-canvas" role="group" tabIndex={0} aria-label={`${name}: ${slices.map(description).join('; ')}`} onKeyDown={(event) => {
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
            return <text x={Number(props.cx) + radius * Math.cos(angle)} y={Number(props.cy) + radius * Math.sin(angle)} textAnchor="middle" dominantBaseline="central" fill="#fff" stroke="#173e32" strokeWidth={2.5} paintOrder="stroke" fontWeight={700} fontSize={14} pointerEvents="none">{percent(positive[props.index])}</text>
          } : false} onMouseEnter={drawable ? (_slice, index) => setHovered(positive[index].period) : undefined} onMouseLeave={() => setHovered(null)} onClick={drawable ? (_slice, index) => select(positive[index].period) : undefined}>
            {(drawable ? positive : [null]).map((slice) => <Cell key={slice?.period ?? 'empty'} fill={slice ? cropColors[slice.period] : '#dce3d9'} opacity={slice && selected !== slice.period ? .8 : 1} cursor={slice ? 'pointer' : 'default'} strokeWidth={slice?.period === selected ? 4 : 2} />)}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      {active && <div className="seasonal-pie-tooltip" role="status"><strong>{active.label}</strong><span>{active.value === null ? active.status : `${format(active.value)} ${unit}`}{percent(active) ? ` · ${percent(active)}` : ''}</span></div>}
    </div>

    <div
      className="seasonal-pie-legend"
      role="group"
      aria-label={vi ? 'Chú thích mùa vụ' : 'Season legend'}
    >
      {slices.map((slice) => (
        <div
          key={slice.period}
          className="seasonal-pie-legend-item"
        >
          <span
            className="seasonal-pie-legend-color"
            style={{
              backgroundColor: cropColors[slice.period],
            }}
            aria-hidden="true"
          />
          <span>{slice.label}</span>
        </div>
      ))}
    </div>

    {negative && <p className="seasonal-pie-note">{vi ? 'Có giá trị âm, không thể hiện cơ cấu: ' : 'Negative values cannot be shown as shares: '}{slices.map(description).join('; ')}</p>}
    {!negative && !drawable && <p className="seasonal-pie-note">{vi ? 'Không tính cơ cấu khi thiếu dữ liệu hoặc tổng bằng 0.' : 'Composition is unavailable with missing data or a zero total.'}</p>}
    {drawable && slices.some(
      (slice) => !slice.notGrown &&
        (slice.value === null || slice.value === 0)
    ) && (
      <p className="seasonal-pie-note">
        {slices
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
