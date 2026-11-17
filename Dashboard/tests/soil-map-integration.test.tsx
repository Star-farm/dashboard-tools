import { readFileSync } from 'node:fs'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import manifest from '../src/data/soil-manifest.json'
import SoilMapPage from '../src/features/map/SoilMapPage'

afterEach(() => vi.unstubAllGlobals())

describe('packaged soil map', () => {
  it('loads only the selected assets, preserves plot selection and reuses visited layers', async () => {
    const texture = manifest.layers.find((layer) => layer.id === 'soil_texture')!
    const landuse = manifest.layers.find((layer) => layer.id === 'landuse')!
    const requests: string[] = []
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      const filename = url.split('/').at(-1)!
      requests.push(filename)
      const body = JSON.parse(readFileSync(`public/map-data/${filename}`, 'utf8'))
      return { ok: true, json: async () => body }
    }))
    const { container } = render(<SoilMapPage language="en" />)
    const firstPlot = await screen.findByRole('button', { name: 'Soil area 0' }, { timeout: 10000 })
    expect(requests).toEqual(expect.arrayContaining([manifest.geometryFile, texture.file]))
    expect(requests).toHaveLength(2)
    fireEvent.click(firstPlot)
    expect(screen.getByRole('complementary')).toHaveTextContent('Soil area 0')

    fireEvent.click(screen.getByRole('button', { name: landuse.title.en }))
    await waitFor(() => expect(container.querySelector('svg image')).toHaveAttribute('href', expect.stringContaining(landuse.rasterFile!)), { timeout: 10000 })
    expect(requests).toEqual(expect.arrayContaining([manifest.geometryFile, texture.file, landuse.file]))
    expect(requests).toHaveLength(3)
    expect(screen.getByRole('complementary')).toHaveTextContent('Soil area 0')
    expect(screen.getByRole('button', { name: landuse.title.en })).toHaveAttribute('aria-pressed', 'true')
    expect(within(screen.getByLabelText(`Legend: ${landuse.title.en}`)).getAllByText(landuse.categories[0].label.en).length).toBeGreaterThan(0)

    fireEvent.click(screen.getByRole('button', { name: texture.title.en }))
    await waitFor(() => expect(screen.getByRole('button', { name: texture.title.en })).toHaveAttribute('aria-pressed', 'true'))
    expect(screen.getByRole('complementary')).toHaveTextContent('Soil area 0')
    expect(requests).toHaveLength(3)
  }, 20000)
})
