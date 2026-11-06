import type { Language } from '../i18n'
import ChartMarker from './ChartMarker'
import type { ChartMarkerShape } from './chartStyles'
import '../styles/chart-legend.css'

interface Props<Key extends string> {
  language: Language
  label: string
  items: { key: Key; label: string; color: string; dashed?: boolean; marker?: ChartMarkerShape }[]
  selected: Key | 'all'
  onSelect: (key: Key | 'all') => void
  allLabel?: string
}

export default function ChartLegend<Key extends string>({ language, label, items, selected, onSelect, allLabel }: Props<Key>) {
  return <div className="interactive-chart-legend" role="group" aria-label={label} data-filtered={selected !== 'all'} data-layout={items.length > 2 ? 'conditions' : 'groups'}>
    <p className="chart-legend-label">{label}</p>
    <button type="button" className="chart-legend-option chart-legend-all" aria-pressed={selected === 'all'} onClick={() => onSelect('all')}>{allLabel ?? (language === 'vi' ? 'Tất cả' : 'All')}</button>
    {items.map((item) => <button key={item.key} type="button" className="chart-legend-option" aria-pressed={selected === item.key} onClick={() => onSelect(item.key)}>
      {item.marker ? <svg className="chart-legend-marker" viewBox="-7 -7 14 14" aria-hidden="true"><ChartMarker shape={item.marker} color={item.color} /></svg> : <span className="chart-legend-swatch" style={item.dashed ? { borderTop: `3px dashed ${item.color}`, background: 'transparent' } : { background: item.color }} aria-hidden="true" />}{item.label}
    </button>)}
  </div>
}
