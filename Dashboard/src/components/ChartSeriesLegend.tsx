import type { Language } from '../i18n'
import { translations } from '../i18n'
import type { CSSProperties } from 'react'
import '../styles/chart-legend.css'
import ScenarioAbbreviations from './ScenarioAbbreviations'

export interface ChartSeriesLegendItem {
  key: string
  label: string
  color: string
  kind?: 'line' | 'bar'
  dashed?: boolean
}

export default function ChartSeriesLegend({ language, items, label, legendTitle }: {
  language: Language
  items: ChartSeriesLegendItem[]
  label?: string
  legendTitle?: string
}) {
  if (!items.length) return null
  return <div className="chart-series-legend" role="group" aria-label={label ?? translations[language].chartLegend}>
    {legendTitle && <p className="chart-series-legend-title">{legendTitle}</p>}
    <p className="chart-legend-caption">{label ?? translations[language].chartLegend}</p>
    <ul>{items.map((item) => <li key={item.key}>
      <span className={`chart-legend-swatch${item.kind === 'bar' ? ' chart-legend-swatch--bar' : ''}${item.dashed ? ' chart-legend-swatch--dashed' : ''}`} style={{ '--chart-series-color': item.color } as CSSProperties} aria-hidden="true" />
      <ScenarioAbbreviations text={item.label} language={language} />
    </li>)}</ul>
  </div>
}
