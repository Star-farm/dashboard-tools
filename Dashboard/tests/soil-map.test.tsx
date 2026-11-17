import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import SoilMapSection from '../src/features/map/SoilMapSection'
import type { MapGeometry } from '../src/features/map/mapTypes'
import type { SoilData } from '../src/features/map/soilTypes'

vi.mock('../src/features/map/soilManifest', () => ({ soilManifest: { layers: [
  { id: 'soil_texture', file: 'texture-fixture.json', title: { vi: 'Thành phần cơ giới', en: 'Soil texture' }, categories: [{ id: 'clay', label: { vi: 'Sét', en: 'Clay' }, color: '#aabbcc' }] },
  { id: 'flooding', file: 'flood-fixture.json', title: { vi: 'Độ sâu ngập', en: 'Flood depth' }, categories: [] },
] } }))

const geometry = {
  width: 100, height: 100, metersPerUnit: 100, crs: 'EPSG:32648', sourceSha256: 'geometry-source',
  plots: [{ id: 0, path: 'M0 0H100V100H0Z', areaHa: 999, center: [50, 50], record: 0 }],
} as MapGeometry
const data: SoilData = {
  version: 1, crs: geometry.crs, geometrySha256: 'geometry-file', sourceGeometrySha256: geometry.sourceSha256, geometryBasis: 'dashboard-display',
  layers: [{
    id: 'soil_texture', title: { vi: 'Thành phần cơ giới', en: 'Soil texture' },
    categories: [{ id: 'clay', label: { vi: 'Sét', en: 'Clay' }, color: '#aabbcc' }],
    features: [{ plotId: 0, categoryId: 'clay', path: 'M0 0H50V100H0Z' }],
    plots: [{ id: 0, areaHa: 10, knownAreaHa: 5, unknownAreaHa: 5, shares: [{ categoryId: 'clay', areaHa: 5 }] }],
  }, {
    id: 'flooding', title: { vi: 'Độ sâu ngập', en: 'Flood depth' }, categories: [], features: [],
    plots: [{ id: 0, areaHa: 10, knownAreaHa: 0, unknownAreaHa: 10, shares: [] }],
  }],
}

afterEach(() => vi.unstubAllGlobals())

describe('soil and flooding overlay', () => {


  it('refuses to overlay data on incompatible source geometry', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => data })))
    render(<SoilMapSection geometry={{ ...geometry, sourceSha256: 'different-source' }} language="vi" />)
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('đối chiếu'))
    expect(screen.queryByRole('button', { name: 'Vùng đất 0' })).not.toBeInTheDocument()
  })
})
