import type { Language } from '../i18n'
import { bau3Text } from '../features/economics/bau3Text'
import { CONDITION_COLORS, CONDITION_MARKERS } from './chartStyles'
import ChartMarker from './ChartMarker'
import type { useConditionFilters } from './useConditionFilters'
import '../styles/condition-filters.css'
import '../styles/chart-legend.css'

export default function ConditionFilters({ language, filters }: { language: Language; filters: ReturnType<typeof useConditionFilters> }) {
  const vi = language === 'vi'
  return <div className="condition-filters">
    <div className="comparison-segmented" role="group" aria-label={vi ? 'Thời tiết' : 'Weather'}>
      <p className="chart-legend-label">{vi ? 'Thời tiết' : 'Weather'}</p>
      {(['all', 'mild', 'severe'] as const).map((key) => <button type="button" key={key} aria-pressed={filters.weather === key} onClick={() => filters.setWeather(key)}>{key === 'all' ? vi ? 'Tất cả' : 'All' : key === 'mild' ? vi ? 'Bình thường' : 'Normal' : vi ? 'Khắc nghiệt' : 'Severe'}</button>)}
    </div>
    <div className="comparison-segmented" role="group" aria-label={vi ? 'Tài nguyên' : 'Resources'}>
      <p className="chart-legend-label">{vi ? 'Tài nguyên' : 'Resources'}</p>
      {(['all', 'normal', 'shortage'] as const).map((key) => <button type="button" key={key} aria-pressed={filters.resource === key} onClick={() => filters.setResource(key)}>{key === 'all' ? vi ? 'Tất cả' : 'All' : key === 'normal' ? vi ? 'Kinh tế bình thường' : 'Normal economy' : vi ? 'Khan hiếm tài nguyên' : 'Resource shortage'}</button>)}
    </div>
  </div>
}

export function ConditionLegend({ language, conditions }: { language: Language; conditions: readonly (keyof typeof CONDITION_COLORS)[] }) {
  const vi = language === 'vi', t = bau3Text[language]
  return <div className="condition-legend-wrap"><p className="chart-legend-caption">{vi ? 'Chú giải' : 'Legend'}</p><ul className="condition-key" aria-label={vi ? 'Chú giải điều kiện' : 'Condition legend'}>{conditions.map((key) => <li key={key}><svg className="chart-legend-marker" viewBox="-7 -7 14 14" aria-hidden="true"><ChartMarker shape={CONDITION_MARKERS[key]} color={CONDITION_COLORS[key]} /></svg>{t[key]}</li>)}</ul></div>
}
