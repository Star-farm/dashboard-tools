
import '../styles/chart-info.css'
import { CONDITION_COLORS, scenarioColor } from './chartStyles'
import type { Bau3Condition } from '../features/economics/bau3Types'
import type { Language } from '../i18n'
import { bau3Text } from '../features/economics/bau3Text'

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
  language,
}: {
  active?: boolean
  label?: unknown
  payload?: readonly TooltipEntry[]
  yearLabel?: string
  format: (value: number) => string
  unit?: string
  language?: Language
}) {
  if (!active || !payload?.length) return null

  return (
    <div className="chart-info chart-info--list" role="status">
      <p className="chart-info-title">
        {yearLabel ? `${yearLabel} ` : ''}
        {String(label ?? '')}
      </p>

      <dl>
        {payload.map((entry, index) => {
          const row = entry.payload
          const group = row?.group ?? row?.model
          const name = group ? row?.label ?? entry.name : entry.name
          const conditionKey = String(entry.dataKey ?? '').split('_').at(-1) as Bau3Condition
          const conditionColor = CONDITION_COLORS[conditionKey]
          const resourceMarker = conditionKey.endsWith('Shortage') ? 'square' : 'circle'
          const conditionLabel = conditionColor && language ? bau3Text[language][conditionKey].split(' · ')[0] : ''
          const compactName = group && conditionColor && language
            ? `${group === 'bau' ? 'BAU' : '1Mha'} · ${conditionLabel}`
            : String(name ?? '')
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
          const labelScenario = /1\s*mha|one million hectares/i.test(String(name ?? ''))
            ? 'oneMha'
            : /business as usual|canh tác như thường lệ|^thường lệ(?:\s|·|$)|\bbau\b/i.test(String(name ?? ''))
              ? 'bau'
              : undefined
          const scenarioKey = scenario ?? labelScenario
          const color =
            (scenarioKey ? scenarioColor(scenarioKey) : undefined) ??
            entry.color ??
            entry.fill ??
            row?.color ??
            row?.fill ??
            conditionColor ??
            '#40533b'

          return (
            <div key={`${String(entry.dataKey)}-${index}`}>
              <dt>
                <span
                  className={`chart-info-swatch chart-info-swatch--${resourceMarker}`}
                  style={{ backgroundColor: color }}
                  data-marker={resourceMarker}
                  aria-hidden="true"
                />
                <span><span className="chart-tooltip-desktop-label">{name}</span><span className="chart-tooltip-mobile-label">{compactName}</span></span>
              </dt>

              <dd>
                {entry.value == null ||
                !Number.isFinite(Number(entry.value))
                  ? '-'
                  : format(Number(entry.value))}
                {unit && <small className="chart-info-unit">{unit}</small>}
              </dd>
            </div>
          )
        })}
      </dl>
    </div>
  )
}
