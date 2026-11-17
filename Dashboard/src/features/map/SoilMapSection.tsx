import { useMemo, useState } from 'react'
import type { Language } from '../../i18n'
import type { MapGeometry } from './mapTypes'
import PlotMap from './PlotMap'
import SoilAreaChart from './SoilAreaChart'
import SoilMapShell, { SoilMapLoading } from './SoilMapShell'
import { soilManifest } from './soilManifest'
import { soilText } from './soilText'
import type { SoilData } from './soilTypes'
import { useMapFile } from './useMapFile'
import { compatibleSoilData } from './validateSoilData'
import '../../styles/soil-map.css'

const emptyValues: (number | null)[] = []
const emptyBreaks: number[] = []

export default function SoilMapSection({ geometry, language, geometryError, geometryRetry }: {
  geometry?: MapGeometry; language: Language; geometryError?: boolean; geometryRetry?: () => void
}) {
  const [layerId, setLayerId] = useState('soil_texture')
  const [selectedPlot, setSelectedPlot] = useState<number | null>(null)
  const selectedLayer = soilManifest.layers.find((layer) => layer.id === layerId) ?? soilManifest.layers[0]
  const file = useMapFile<SoilData>(selectedLayer.file)
  const retained = file.data ?? file.previousData
  const t = soilText[language]
  const valid = useMemo(() => {
    try { return !!retained && !!geometry && compatibleSoilData(retained, geometry) } catch { return false }
  }, [retained, geometry])
  const layer = valid ? retained?.layers.find((item) => item.id === layerId) : undefined
  const displayed = layer ?? (valid ? retained?.layers[0] : undefined)
  const failed = geometryError || file.error || (!!file.data && !!geometry && (!valid || !layer))
  return <SoilMapShell language={language} layerId={layerId} onLayerChange={setLayerId} chart={<SoilAreaChart layer={layer} layerId={layerId} selectedLayer={selectedLayer} selectedPlot={selectedPlot} language={language} failed={failed} />}>
    {geometry && displayed ? <div inert={!layer || !!failed} aria-hidden={!layer || !!failed}><PlotMap geometry={geometry} language={language} thematic={displayed} rasterFile={layer ? selectedLayer.rasterFile : undefined} onSelectionChange={setSelectedPlot} values={emptyValues} metric="yield" breaks={emptyBreaks} yieldValues={emptyValues} incomeValues={emptyValues} periodLabel="" scenarioLabel="" /></div> : <SoilMapLoading language={language} />}
    {failed ? <div className="map-loading-overlay"><div className="map-error" role="alert"><p>{t.error}</p><button type="button" className="primary-button" onClick={() => geometryError ? geometryRetry?.() : file.retry()}>{t.retry}</button></div></div>
      : !layer && displayed && <div className="map-loading-overlay" role="status">{t.loading}</div>}
  </SoilMapShell>
}

