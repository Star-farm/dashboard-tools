import { useMemo, useState } from 'react'
import type { Language } from '../../i18n'
import type { MapGeometry } from './mapTypes'
import PlotMap from './PlotMap'
import SoilMapShell, { SoilMapLoading } from './SoilMapShell'
import { soilManifest } from './soilManifest'
import { soilText } from './soilText'
import type { SoilData } from './soilTypes'
import { useMapFile } from './useMapFile'
import '../../styles/soil-map.css'

const emptyValues: (number | null)[] = []
const emptyBreaks: number[] = []

function compatible(data: SoilData, geometry: MapGeometry) {
  if (data.version !== 1 || data.geometryBasis !== 'dashboard-display' || data.crs !== geometry.crs || data.sourceGeometrySha256 !== geometry.sourceSha256 || !Array.isArray(data.layers) || !data.layers.length) return false
  const plotIds = new Set(geometry.plots.map((plot) => plot.id))
  if (new Set(data.layers.map((layer) => layer.id)).size !== data.layers.length) return false
  return data.layers.every((layer) => {
    if (!Array.isArray(layer.plots) || !Array.isArray(layer.features) || !Array.isArray(layer.categories) || !layer.title?.vi || !layer.title?.en) return false
    const categories = new Set(layer.categories.map((category) => category.id))
    if (categories.size !== layer.categories.length || layer.categories.some((category) => !category.label?.vi || !category.label?.en || typeof category.color !== 'string')) return false
    return layer.plots.length === plotIds.size && new Set(layer.plots.map((plot) => plot.id)).size === plotIds.size && layer.plots.every((plot) =>
      plotIds.has(plot.id) && [plot.areaHa, plot.knownAreaHa, plot.unknownAreaHa].every((area) => Number.isFinite(area) && area >= 0) &&
      Math.abs(plot.areaHa - plot.knownAreaHa - plot.unknownAreaHa) <= Math.max(0.001, plot.areaHa * 0.00001) &&
      Array.isArray(plot.shares) && plot.shares.every((share) => categories.has(share.categoryId) && Number.isFinite(share.areaHa) && share.areaHa >= 0) &&
      new Set(plot.shares.map((share) => share.categoryId)).size === plot.shares.length &&
      Math.abs(plot.shares.reduce((sum, share) => sum + share.areaHa, 0) - plot.knownAreaHa) <= Math.max(0.001, plot.areaHa * 0.00001)
    ) && layer.features.every((feature) => plotIds.has(feature.plotId) && categories.has(feature.categoryId) && typeof feature.path === 'string')
  })
}

export default function SoilMapSection({ geometry, language, geometryError, geometryRetry }: {
  geometry?: MapGeometry; language: Language; geometryError?: boolean; geometryRetry?: () => void
}) {
  const [layerId, setLayerId] = useState('soil_texture')
  const selectedLayer = soilManifest.layers.find((layer) => layer.id === layerId) ?? soilManifest.layers[0]
  const file = useMapFile<SoilData>(selectedLayer.file)
  const retained = file.data ?? file.previousData
  const t = soilText[language]
  const valid = useMemo(() => {
    try { return !!retained && !!geometry && compatible(retained, geometry) } catch { return false }
  }, [retained, geometry])
  const layer = valid ? retained?.layers.find((item) => item.id === layerId) : undefined
  const displayed = layer ?? (valid ? retained?.layers[0] : undefined)
  const failed = geometryError || file.error || (!!file.data && !!geometry && (!valid || !layer))
  return <SoilMapShell language={language} layerId={layerId} onLayerChange={setLayerId}>
    {geometry && displayed ? <div inert={!layer || !!failed} aria-hidden={!layer || !!failed}><PlotMap geometry={geometry} language={language} thematic={displayed} values={emptyValues} metric="yield" breaks={emptyBreaks} yieldValues={emptyValues} incomeValues={emptyValues} periodLabel="" scenarioLabel="" /></div> : <SoilMapLoading language={language} />}
    {failed ? <div className="map-loading-overlay"><div className="map-error" role="alert"><p>{t.error}</p><button type="button" className="primary-button" onClick={() => geometryError ? geometryRetry?.() : file.retry()}>{t.retry}</button></div></div>
      : !layer && displayed && <div className="map-loading-overlay" role="status">{t.loading}</div>}
  </SoilMapShell>
}
