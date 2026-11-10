import { afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
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
  it('loads immediately, retries a failed request, shows real clipped fragments and unknown area shares', async () => {
    let fail = true
    const fetcher = vi.fn(async (url: string) => ({ ok: !fail, status: 503, json: async () => ({ ...data, layers: [data.layers[url.endsWith('flood-fixture.json') ? 1 : 0]] }) }))
    vi.stubGlobal('fetch', fetcher)
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const { container, rerender } = render(<SoilMapSection language="vi" />)
    expect(container.querySelector('.soil-map-stage .plot-map-frame')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Độ sâu ngập' })).toBeInTheDocument()
    rerender(<SoilMapSection geometry={geometry} language="vi" />)
    expect(await screen.findByRole('alert')).toHaveTextContent('Không thể tải')
    expect(fetcher).toHaveBeenCalledOnce()
    expect(screen.queryByText('Xem bản đồ đất và ngập')).not.toBeInTheDocument()
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
    fail = false
    fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }))
    const area = await screen.findByRole('button', { name: 'Vùng đất 0' })
    expect(area).toHaveAttribute('fill', '#b9bdb6')
    expect(container.querySelector('g[pointer-events="none"] path')).toHaveAttribute('d', data.layers[0].features[0].path)
    fireEvent.click(area)
    const popup = screen.getByRole('dialog', { name: 'Vùng đất 0' })
    expect(within(popup).getByText('10')).toBeInTheDocument()
    expect(within(popup).queryByText('999')).not.toBeInTheDocument()
    expect(within(popup).getByText('Chưa xác định').parentElement).toHaveTextContent('50% (5 ha)')
    fireEvent.click(screen.getByRole('button', { name: 'Độ sâu ngập' }))
    await waitFor(() => expect(within(popup).getByText('Độ sâu ngập')).toBeInTheDocument())
    expect(within(popup).getByText('Chưa xác định').parentElement).toHaveTextContent('100% (10 ha)')
    expect(container.querySelector('g[pointer-events="none"] path:not([fill="none"])')).not.toBeInTheDocument()
    expect(container.querySelectorAll('g[pointer-events="none"] path[fill="none"]')).toHaveLength(geometry.plots.length)
    rerender(<SoilMapSection geometry={geometry} language="en" />)
    expect(screen.getByRole('dialog', { name: 'Soil area 0' })).toHaveTextContent('Undetermined')
    fireEvent.click(screen.getByRole('button', { name: 'Soil texture' }))
    const englishPopup = screen.getByRole('dialog', { name: 'Soil area 0' })
    expect(within(englishPopup).getByText('Clay')).toBeInTheDocument()
    expect(within(englishPopup).queryByText('Sét')).not.toBeInTheDocument()
    expect(screen.queryByText(/Play the timeline/)).not.toBeInTheDocument()
    expect(fetcher.mock.calls.map(([url]) => url.split('/').at(-1))).toEqual(['texture-fixture.json', 'texture-fixture.json', 'flood-fixture.json'])
  })

  it('refuses to overlay data on incompatible source geometry', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => data })))
    render(<SoilMapSection geometry={{ ...geometry, sourceSha256: 'different-source' }} language="vi" />)
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('đối chiếu'))
    expect(screen.queryByRole('button', { name: 'Vùng đất 0' })).not.toBeInTheDocument()
  })
})
