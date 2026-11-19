import type { Language } from '../../i18n'
import { mapText } from './mapText'

const REGION = { west: 94, south: 4, east: 116, north: 23 }

function projectToUtm48(longitude: number, latitude: number): [number, number] {
  const a = 6378137
  const eccentricitySquared = 0.0066943799901413165
  const k0 = 0.9996
  const phi = latitude * Math.PI / 180
  const lambda = (longitude - 105) * Math.PI / 180
  const sinPhi = Math.sin(phi)
  const cosPhi = Math.cos(phi)
  const tanPhi = Math.tan(phi)
  const n = a / Math.sqrt(1 - eccentricitySquared * sinPhi ** 2)
  const t = tanPhi ** 2
  const c = eccentricitySquared / (1 - eccentricitySquared) * cosPhi ** 2
  const alpha = cosPhi * lambda
  const m = a * ((1 - eccentricitySquared / 4 - 3 * eccentricitySquared ** 2 / 64 - 5 * eccentricitySquared ** 3 / 256) * phi
    - (3 * eccentricitySquared / 8 + 3 * eccentricitySquared ** 2 / 32 + 45 * eccentricitySquared ** 3 / 1024) * Math.sin(2 * phi)
    + (15 * eccentricitySquared ** 2 / 256 + 45 * eccentricitySquared ** 3 / 1024) * Math.sin(4 * phi)
    - 35 * eccentricitySquared ** 3 / 3072 * Math.sin(6 * phi))
  const easting = 500000 + k0 * n * (alpha + (1 - t + c) * alpha ** 3 / 6
    + (5 - 18 * t + t ** 2 + 72 * c - 58 * (eccentricitySquared / (1 - eccentricitySquared))) * alpha ** 5 / 120)
  const northing = k0 * (m + n * tanPhi * (alpha ** 2 / 2
    + (5 - t + 9 * c + 4 * c ** 2) * alpha ** 4 / 24
    + (61 - 58 * t + t ** 2 + 600 * c - 330 * (eccentricitySquared / (1 - eccentricitySquared))) * alpha ** 6 / 720))
  return [easting, northing]
}

function regionBounds() {
  const edges = [
    (step: number) => [REGION.west + (REGION.east - REGION.west) * step, REGION.north] as const,
    (step: number) => [REGION.east, REGION.north - (REGION.north - REGION.south) * step] as const,
    (step: number) => [REGION.east - (REGION.east - REGION.west) * step, REGION.south] as const,
    (step: number) => [REGION.west, REGION.south + (REGION.north - REGION.south) * step] as const,
  ]
  const projected = edges.flatMap((edge) => Array.from({ length: 65 }, (_, index) => projectToUtm48(...edge(index / 64))))
  return {
    minX: Math.min(...projected.map(([x]) => x)),
    maxX: Math.max(...projected.map(([x]) => x)),
    minY: Math.min(...projected.map(([, y]) => y)),
    maxY: Math.max(...projected.map(([, y]) => y)),
  }
}

const projectedBounds = regionBounds()

export default function MapBasemap({ bounds, metersPerUnit }: { bounds: number[]; metersPerUnit: number }) {
  if (bounds.length !== 4 || !bounds.every(Number.isFinite) || !Number.isFinite(metersPerUnit) || metersPerUnit <= 0) return null
  const x = (projectedBounds.minX - bounds[0]) / metersPerUnit
  const y = (bounds[3] - projectedBounds.maxY) / metersPerUnit
  const width = (projectedBounds.maxX - projectedBounds.minX) / metersPerUnit
  const height = (projectedBounds.maxY - projectedBounds.minY) / metersPerUnit
  return <image
    aria-hidden="true"
    className="map-basemap-image"
    href={`${import.meta.env.BASE_URL}map-data/static-basemap.jpg`}
    x={x}
    y={y}
    width={width}
    height={height}
    preserveAspectRatio="none"
    pointerEvents="none"
  />
}

export function MapGeographicLabels({ bounds, metersPerUnit, language, labelSize }: { bounds: number[]; metersPerUnit: number; language: Language; labelSize: number }) {
  if (bounds.length !== 4 || !bounds.every(Number.isFinite) || !Number.isFinite(metersPerUnit) || metersPerUnit <= 0) return null
  const toMap = (longitude: number, latitude: number) => {
    const [east, north] = projectToUtm48(longitude, latitude)
    return [(east - bounds[0]) / metersPerUnit, (bounds[3] - north) / metersPerUnit]
  }
  const labels = [
    { name: mapText[language].countryThailand, point: toMap(100.5, 12.5) },
    { name: mapText[language].countryLaos, point: toMap(105.1, 13.5) },
    { name: mapText[language].countryCambodia, point: toMap(104.5, 11.5) },
    { name: mapText[language].eastSea, point: toMap(112.2, 12.5), sea: true },
  ]

  return <g className="map-geographic-labels" pointerEvents="none" role="group" aria-label={mapText[language].geographicLabels}>
    {labels.map(({ name, point, sea }) => <text key={name} x={point[0]} y={point[1]} textAnchor="middle" fontSize={labelSize} fontWeight={sea ? 500 : 700} fontStyle={sea ? 'italic' : undefined} fill={sea ? '#28758a' : '#465847'} stroke="#fffefa" strokeWidth={labelSize * 0.18} paintOrder="stroke">{name}</text>)}
  </g>
}
