import type { Language } from '../i18n'
import { bau3Conditions, type Bau3Condition } from '../features/economics/bau3Types'
import { bau3Text } from '../features/economics/bau3Text'
import { CONDITION_MARKERS, SCENARIO_COLORS } from './chartStyles'
import ChartMarker from './ChartMarker'
import '../styles/chart-info.css'

interface TooltipEntry {
  dataKey?: unknown
  value?: unknown
}

export default function ConditionComparisonTooltip({ active, label, payload, yearLabel, language, format }: {
  active?: boolean
  label?: unknown
  payload?: readonly TooltipEntry[]
  yearLabel: string
  language: Language
  format: (value: number) => string
  unit?: string
}) {
  if (!active || !payload?.length) return null

  const t = bau3Text[language]
  const entries = new Map(payload.map((entry) => [String(entry.dataKey), entry]))
  const conditions = bau3Conditions.filter((condition) =>
    entries.has(`bau_${condition}`) || entries.has(`oneMha_${condition}`),
  )
  const value = (group: 'bau' | 'oneMha', condition: Bau3Condition) => {
    const amount = entries.get(`${group}_${condition}`)?.value
    return amount == null || !Number.isFinite(Number(amount)) ? '-' : format(Number(amount))
  }

  if (!conditions.length) return null

  return <div className="chart-info chart-info--comparison" role="status">
    <p className="chart-info-title">{yearLabel} {String(label ?? '')}</p>
    <table className="chart-info-condition-table">
      <thead><tr>
        <th scope="col">{t.conditionColumn}</th>
        <th className="chart-info-bau" scope="col">BAU</th>
        <th className="chart-info-one-mha" scope="col">1Mha</th>
      </tr></thead>
      <tbody>{conditions.map((condition) => <tr key={condition}>
        <th scope="row"><svg className="chart-info-condition-marker" viewBox="-10 -7 20 14" aria-hidden="true"><ChartMarker shape={CONDITION_MARKERS[condition]} color={SCENARIO_COLORS.bau} cx={-4} /><ChartMarker shape={CONDITION_MARKERS[condition]} color={SCENARIO_COLORS.oneMha} cx={4} /></svg><span className="chart-condition-desktop-label">{t[condition]}</span><span className="chart-condition-mobile-label">{language === 'vi'
          ? `${condition.startsWith('severe') ? 'Khắc nghiệt' : 'Bình thường'} · ${condition.endsWith('Shortage') ? 'Khan hiếm' : 'Tài nguyên thường'}`
          : `${condition.startsWith('severe') ? 'Severe' : 'Normal'} · ${condition.endsWith('Shortage') ? 'Shortage' : 'Normal resources'}`}</span></th>
        <td>{value('bau', condition)}</td>
        <td>{value('oneMha', condition)}</td>
      </tr>)}</tbody>
    </table>
  </div>
}
