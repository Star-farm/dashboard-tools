import type { MapGeometry } from './mapTypes'
import type { SoilData } from './soilTypes'

export function compatibleSoilData(data: SoilData, geometry: MapGeometry): boolean {
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
