import type { Language } from '../i18n'
import '../styles/chart-legend.css'

interface Props<Key extends string> {
  language: Language
  label: string
  items: { key: Key; label: string; color: string; dashed?: boolean }[]
  selected: Key | 'all'
  onSelect: (key: Key | 'all') => void
  allLabel?: string
}

export default function ChartLegend<Key extends string>({ language, label, items, selected, onSelect, allLabel }: Props<Key>) {
  return <div className="interactive-chart-legend" role="group" aria-label={label} data-filtered={selected !== 'all'} data-layout={items.length > 2 ? 'conditions' : 'groups'}>
    <button type="button" className="chart-legend-option chart-legend-all" aria-pressed={selected === 'all'} onClick={() => onSelect('all')}>{allLabel ?? (language === 'vi' ? 'Tất cả' : 'All')}</button>
    {items.map((item) => <button key={item.key} type="button" className="chart-legend-option" aria-pressed={selected === item.key} onClick={() => onSelect(item.key)}>
      <span className="chart-legend-swatch" style={item.dashed ? { borderTop: `3px dashed ${item.color}`, background: 'transparent' } : { background: item.color }} aria-hidden="true" />{item.label}
    </button>)}
  </div>
}
