export type SoilLabel = { vi: string; en: string }
export interface SoilCategory { id: string; label: SoilLabel; color: string }
export interface SoilPlot {
  id: number
  areaHa: number
  knownAreaHa: number
  unknownAreaHa: number
  shares: { categoryId: string; areaHa: number }[]
}
export interface SoilLayer {
  id: string
  title: SoilLabel
  categories: SoilCategory[]
  features: { plotId: number; categoryId: string; path: string }[]
  plots: SoilPlot[]
}
export interface SoilData {
  version: 1
  crs: string
  geometrySha256: string
  sourceGeometrySha256: string
  geometryBasis: 'dashboard-display'
  layers: SoilLayer[]
}

export type SoilLayerInfo = Pick<SoilLayer, 'id' | 'title' | 'categories'> & { file: string; rasterFile?: string }
export type SoilManifest = Omit<SoilData, 'layers'> & { geometryFile: string; layers: SoilLayerInfo[] }

export const soilUnknownColor = '#b9bdb6'
