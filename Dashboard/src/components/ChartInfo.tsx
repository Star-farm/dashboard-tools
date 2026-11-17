
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
}: {
  active?: boolean
  label?: unknown
  payload?: readonly TooltipEntry[]
  yearLabel?: string
  format: (value: number) => string
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
                {entry.name}
              </dt>

              <dd>
                {entry.value == null ||
                !Number.isFinite(Number(entry.value))
                  ? '—'
                  : format(Number(entry.value))}
              </dd>
            </div>
          )
        })}
      </dl>
    </div>
  )
}
