import type { Language } from '../i18n'
import { CONDITION_COLORS } from './chartStyles'
import type { useConditionFilters } from './useConditionFilters'
import '../styles/condition-filters.css'
import '../styles/chart-legend.css'

export default function ConditionFilters({ language, filters, normalResourceLabel }: { language: Language; filters: ReturnType<typeof useConditionFilters>; normalResourceLabel?: string }) {
  const vi = language === 'vi'
  return <div className="condition-filters">
    <div className="comparison-segmented" role="group" aria-label={vi ? 'Thời tiết' : 'Weather'}>
      <p className="chart-legend-label">{vi ? 'Thời tiết' : 'Weather'}</p>
      {(['all', 'mild', 'severe'] as const).map((key) => <button type="button" key={key} aria-pressed={filters.weather === key} onClick={() => filters.setWeather(key)}>{key === 'all' ? vi ? 'Tất cả' : 'All' : key === 'mild' ? vi ? 'Bình thường' : 'Normal' : vi ? 'Khắc nghiệt' : 'Severe'}</button>)}
    </div>
    <div className="comparison-segmented" role="group" aria-label={vi ? 'Tài nguyên' : 'Resources'}>
      <p className="chart-legend-label">{vi ? 'Tài nguyên' : 'Resources'}</p>
      {(['all', 'normal', 'shortage'] as const).map((key) => <button type="button" key={key} aria-pressed={filters.resource === key} onClick={() => filters.setResource(key)}>{key === 'all' ? vi ? 'Tất cả' : 'All' : key === 'normal' ? normalResourceLabel ?? (vi ? 'Bình thường' : 'Normal') : vi ? 'Khan hiếm tài nguyên' : 'Resource shortage'}</button>)}
    </div>
  </div>
}

export function ConditionLegend({ language, conditions, normalResourceLabel }: { language: Language; conditions: readonly (keyof typeof CONDITION_COLORS)[]; normalResourceLabel?: string }) {
  const vi = language === 'vi'
  const severe = conditions.some((key) => key.startsWith('severe'))
  const normalWeather = conditions.some((key) => key.startsWith('mild'))
  const shortage = conditions.some((key) => key.endsWith('Shortage'))
  const normalResources = conditions.some((key) => key.endsWith('Normal'))
  return <div className="condition-legend-wrap">
    <div className="condition-legend-group"><p className="chart-legend-caption">{vi ? 'Thời tiết' : 'Weather'}</p><ul className="condition-key" aria-label={vi ? 'Chú giải thời tiết' : 'Weather legend'}>
      {normalWeather && <li><span className="encoding-line" aria-hidden="true" />{vi ? 'Bình thường' : 'Normal'}</li>}
      {severe && <li><span className="encoding-line encoding-line--dashed" aria-hidden="true" />{vi ? 'Khắc nghiệt' : 'Severe'}</li>}
    </ul></div>
    <div className="condition-legend-group"><p className="chart-legend-caption">{vi ? 'Tài nguyên' : 'Resources'}</p><ul className="condition-key" aria-label={vi ? 'Chú giải tài nguyên' : 'Resource legend'}>
      {normalResources && <li><span className="encoding-marker encoding-marker--circle" aria-hidden="true" />{normalResourceLabel ?? (vi ? 'Bình thường' : 'Normal')}</li>}
      {shortage && <li><span className="encoding-marker encoding-marker--triangle" aria-hidden="true" />{vi ? 'Khan hiếm' : 'Resource shortage'}</li>}
    </ul></div>
  </div>
}
