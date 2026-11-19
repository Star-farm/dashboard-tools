import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import SoilMapSection from '../src/features/map/SoilMapSection'
import type { MapGeometry } from '../src/features/map/mapTypes'

vi.mock('../src/features/map/soilManifest', () => ({ soilManifest: { layers: [
  { id: 'soil_texture', file: 'transition-texture.json', title: { vi: 'Đất', en: 'Texture' }, categories: [] },
  { id: 'flooding', file: 'transition-flood.json', title: { vi: 'Ngập', en: 'Flood' }, categories: [] },
] } }))

const geometry = {
  width: 100, height: 100, metersPerUnit: 100, crs: 'EPSG:32648', bounds: [0, 0, 10000, 10000], sourceSha256: 'transition-source',
  plots: [{ id: 0, path: 'M0 0H100V100H0Z', areaHa: 10, center: [50, 50], record: 0 }],
} as MapGeometry
const layer = (id: string) => ({
  version: 1, crs: geometry.crs, sourceGeometrySha256: geometry.sourceSha256, geometryBasis: 'dashboard-display',
  layers: [{ id, title: { vi: id, en: id }, categories: [], features: [], plots: [{ id: 0, areaHa: 10, knownAreaHa: 0, unknownAreaHa: 10, shares: [] }] }],
})

afterEach(() => vi.unstubAllGlobals())

it('keeps the selected plot and view while switching from a cached layer to a loading layer', async () => {
  let finishFlood!: (response: Response) => void
  vi.stubGlobal('fetch', vi.fn((url: string) => url.endsWith('transition-flood.json')
    ? new Promise<Response>((resolve) => { finishFlood = resolve })
    : Promise.resolve({ ok: true, json: async () => layer('soil_texture') } as Response)))
  const first = render(<SoilMapSection geometry={geometry} language="en" />)
  await screen.findByRole('button', { name: 'Soil area 0' })
  first.unmount()

  const second = render(<SoilMapSection geometry={geometry} language="en" />)
  fireEvent.click(screen.getByRole('button', { name: 'Soil area 0' }))
  fireEvent.click(screen.getByRole('button', { name: 'Zoom in' }))
  const svg = second.container.querySelector('svg.plot-map-svg')!
  const zoomedView = svg.getAttribute('viewBox')
  fireEvent.click(screen.getByRole('button', { name: 'Flood' }))
  expect(second.container.querySelector('svg.plot-map-svg')).toBe(svg)
  expect(svg).toHaveAttribute('viewBox', zoomedView)

  await act(async () => { finishFlood({ ok: true, json: async () => layer('flooding') } as Response) })
  await waitFor(() => expect(screen.getByRole('complementary')).toHaveTextContent('Soil area 0'))
  expect(second.container.querySelector('svg.plot-map-svg')).toBe(svg)
  expect(svg).toHaveAttribute('viewBox', zoomedView)
})
