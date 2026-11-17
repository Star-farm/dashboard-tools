
import '../styles/chart-info.css'
import { scenarioColor } from './chartStyles'

type TooltipEntry = {
  name?: string | number
  value?: unknown
  color?: string
  fill?: string
  dataKey?: unknown
  payload?: {
    group?: string
    model?: string
    label?: string
    color?: string
    fill?: string
  }
}

export default function ChartInfo({
  active,
  label,
  payload,
  yearLabel,
  format,
  unit,
}: {
  active?: boolean
  label?: unknown
  payload?: readonly TooltipEntry[]
  yearLabel?: string
  format: (value: number) => string
  unit?: string
}) {
  if (!active || !payload?.length) return null

  return (
    <div className="chart-info" role="status">
      <p className="chart-info-title">
        {yearLabel ? `${yearLabel} ` : ''}
        {String(label ?? '')}
      </p>

      <dl>
        {payload.map((entry, index) => {
          const row = entry.payload
          const group = row?.group ?? row?.model
          const name = group ? row?.label ?? entry.name : entry.name
          const compactName = String(name ?? '')
            .replace(/Business As Usual|Canh tác như thường lệ/gi, 'BAU')
            .replace(/^Thường lệ(?= ·|$)/i, 'BAU')
            .replace(/Severe weather|Normal weather/gi, (label) => label.startsWith('Severe') ? 'Severe' : 'Normal')
            .replace(/Resource shortage/gi, 'Shortage')
            .replace(/Normal resources/gi, 'Normal')
            .replace(/Khan hiếm tài nguyên/gi, 'Thiếu')
            .replace(/Tài nguyên bình thường/gi, 'Thường')

          const scenario =
            group === 'bau' || group === 'oneMha'
              ? group
              : undefined

          const color =
            row?.color ??
            (scenario ? scenarioColor(scenario) : undefined) ??
            row?.fill ??
            entry.fill ??
            entry.color ??
            '#40533b'

          return (
            <div key={`${String(entry.dataKey)}-${index}`}>
              <dt>
                <i
                  style={{ backgroundColor: color }}
                  aria-hidden="true"
                />
                <><span className="chart-tooltip-desktop-label">{name}</span><span className="chart-tooltip-mobile-label">{compactName}</span></>
              </dt>

              <dd>
                {entry.value == null ||
                !Number.isFinite(Number(entry.value))
                  ? '—'
                  : <>{format(Number(entry.value))}{unit && <> <span className="chart-info-unit">{unit}</span></>}</>}
              </dd>
            </div>
          )
        })}
      </dl>
    </div>
  )
}
