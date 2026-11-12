import type { ReactNode } from 'react'
import type { Language } from '../../i18n'
import { soilManifest } from './soilManifest'
import { soilText } from './soilText'
import { soilUnknownColor } from './soilTypes'
import '../../styles/map.css'
import '../../styles/soil-map.css'

// Identical layout before the route, geometry, and selected layer arrive.
export function SoilPageShell({ language, children }: { language: Language; children: ReactNode }) {
  const vi = language === 'vi'
  return <div className="map-page page-shell" id="soil-map">
    <section className="intro" aria-labelledby="soil-map-page-title"><h1 id="soil-map-page-title">{vi ? 'Bản đồ đất và ngập' : 'Soil and flooding map'}</h1><p className="map-description">{vi ? 'Khám phá thông tin đất và độ sâu ngập trên ranh giới vùng canh tác.' : 'Explore soil and flood depth information on farming area boundaries.'}</p></section>
    {children}
  </div>
}

export default function SoilMapShell({ language, layerId = 'soil_texture', onLayerChange, children }: {
  language: Language; layerId?: string; onLayerChange?: (id: string) => void; children: ReactNode
}) {
  const t = soilText[language]
  const layer = soilManifest.layers.find((item) => item.id === layerId) ?? soilManifest.layers[0]
  return <section className="soil-map-section map-workspace" aria-labelledby="soil-map-title">
    <div className="map-workspace-heading"><h2 id="soil-map-title">{t.title}</h2></div>
    <div className="soil-map-intro"><p>{t.accuracy}</p></div>
    <div className="soil-layer-control">
      <p id="soil-layer-label">{t.layer}</p>
      <div className="map-layer-switch" role="group" aria-labelledby="soil-layer-label">
        {soilManifest.layers.map((item) => <button key={item.id} type="button" disabled={!onLayerChange} aria-pressed={layer.id === item.id} onClick={() => onLayerChange?.(item.id)}>{item.title[language]}</button>)}
      </div>
    </div>
    <div className="soil-map-stage">{children}</div>
    <div className="soil-map-legend" aria-label={`${t.legend}: ${layer.title[language]}`}>
      {[...layer.categories, { id: 'undetermined', label: { vi: soilText.vi.unknown, en: soilText.en.unknown }, color: soilUnknownColor }].map((category) => <span key={category.id}><i aria-hidden="true" style={{ background: category.color }} />{category.label[language]}</span>)}
    </div>
    <p className="map-interaction-help" id="soil-map-interaction-help">{t.instructions}</p>
  </section>
}

export function SoilMapLoading({ language }: { language: Language }) {
  return <div className="plot-map-frame soil-map-placeholder" role="status">{soilText[language].loading}</div>
}

export function SoilPageLoading({ language }: { language: Language }) {
  return <SoilPageShell language={language}><SoilMapShell language={language}><SoilMapLoading language={language} /></SoilMapShell></SoilPageShell>
}
