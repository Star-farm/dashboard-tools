import type { Language } from '../../i18n'
import type { MapGeometry } from './mapTypes'
import SoilMapSection from './SoilMapSection'
import { SoilPageShell } from './SoilMapShell'
import { soilManifest } from './soilManifest'
import { useMapFile } from './useMapFile'

export default function SoilMapPage({ language }: { language: Language }) {
  const geometry = useMapFile<MapGeometry>(soilManifest.geometryFile)
  return <SoilPageShell language={language}>
    <SoilMapSection geometry={geometry.data} language={language} geometryError={geometry.error} geometryRetry={geometry.retry} />
  </SoilPageShell>
}
