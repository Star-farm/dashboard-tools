import '../styles/chart-info.css'

export default function ChartInfo({ active, label, payload, yearLabel, format }: {
  active?: boolean
  label?: unknown
  payload?: readonly { name?: string | number; value?: unknown; color?: string; dataKey?: unknown }[]
  yearLabel?: string
  format: (value: number) => string
}) {
  if (!active || !payload?.length) return null
  return <div className="chart-info" role="status">
    <p className="chart-info-title">{yearLabel ? `${yearLabel} ` : ''}{String(label ?? '')}</p>
    <dl>{payload.map((entry, index) => <div key={`${String(entry.dataKey)}-${index}`}>
      <dt><i style={{ background: entry.color ?? '#40533b' }} aria-hidden="true" />{entry.name}</dt>
      <dd>{entry.value == null || !Number.isFinite(Number(entry.value)) ? '—' : format(Number(entry.value))}</dd>
    </div>)}</dl>
  </div>
}
