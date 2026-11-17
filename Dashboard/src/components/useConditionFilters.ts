import { bau3Conditions } from '../features/economics/bau3Types'
import { useChartSelection } from './chartSelectionContext'

type Weather = 'all' | 'mild' | 'severe'
type Resource = 'all' | 'normal' | 'shortage'

export function useConditionFilters() {
  const [weather, setWeather] = useChartSelection<Weather>('weather', 'all')
  const [resource, setResource] = useChartSelection<Resource>('resource', 'all')
  const visible = bau3Conditions.filter((key) => (weather === 'all' || key.startsWith(weather)) && (resource === 'all' || key.endsWith(resource === 'normal' ? 'Normal' : 'Shortage')))
  return { weather, setWeather, resource, setResource, visible }
}
