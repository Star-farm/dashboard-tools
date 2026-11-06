import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts'
import type { Language } from '../../i18n'
import type { CropPeriod } from './seasonalData'

const cropColors: Record<CropPeriod, string> = { early: '#267e91', middle: '#ba861f', late: '#8859a5' }
export interface SeasonalSlice { period: CropPeriod; label: string; value: number | null; status?: string }

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
  const negative = slices.some((slice) => slice.value !== null && slice.value < 0)
  const positive = slices.filter((slice) => slice.value !== null && slice.value > 0)
  const drawable = !negative && positive.length > 0
  return <figure className="seasonal-pie">
    <figcaption style={{ color }}>{name}</figcaption>
    <div className="seasonal-pie-canvas" role="img" aria-label={`${name}: ${slices.map((slice) => `${slice.label}: ${slice.value === null ? slice.status : `${format(slice.value)} ${unit}`}`).join('; ')}`}>
      <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 240, height: 210 }}>
        <PieChart>
          <Pie data={drawable ? positive : [{ label: '', value: 1, period: 'early' }]} dataKey="value" nameKey="label" cx="50%" cy="50%" innerRadius="48%" outerRadius="85%" startAngle={90} endAngle={-270} paddingAngle={drawable && positive.length > 1 ? 3 : 0} stroke="#fffefa" strokeWidth={2} isAnimationActive={false} onClick={drawable ? (_slice, index) => onSelect(positive[index].period) : undefined}>
            {(drawable ? positive : [null]).map((slice) => <Cell key={slice?.period ?? 'empty'} fill={slice ? cropColors[slice.period] : '#dce3d9'} opacity={slice && selected !== slice.period ? .8 : 1} cursor={slice ? 'pointer' : 'default'} strokeWidth={slice?.period === selected ? 4 : 2} />)}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <span className="seasonal-pie-center" aria-hidden="true">{vi ? 'Theo vụ' : 'By season'}</span>
    </div>
    {negative && <p className="seasonal-pie-note">{vi ? 'Có giá trị âm: xem số liệu từng vụ bên dưới.' : 'Negative values: see the crop values below.'}</p>}
    {!negative && !drawable && <p className="seasonal-pie-note">{vi ? 'Không có giá trị dương để chia lát cắt.' : 'There are no positive values to draw slices.'}</p>}
    <p className="seasonal-pie-filter-label">{vi ? 'Chọn mùa vụ' : 'Choose crop season'}</p>
    <ul className="seasonal-pie-values">{slices.map((slice) => <li key={slice.period}><button type="button" aria-label={`${slice.label}: ${slice.value === null ? slice.status : `${format(slice.value)} ${unit}`}`} aria-pressed={selected === slice.period} onClick={() => onSelect(slice.period)}>
      <span className="seasonal-pie-crop"><i style={{ background: cropColors[slice.period] }} aria-hidden="true" />{slice.label}</span>
      <strong>{slice.value === null ? slice.status : <>{format(slice.value)} <small>{unit}</small></>}</strong>
    </button></li>)}</ul>
  </figure>
}
