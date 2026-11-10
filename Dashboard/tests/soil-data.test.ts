import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { gzipSync } from 'node:zlib'
import manifest from '../src/data/soil-manifest.json'
import type { SoilData } from '../src/features/map/soilTypes'
import type { MapGeometry } from '../src/features/map/mapTypes'

const geometryBytes = readFileSync('public/map-data/geometry.json')
const geometry = JSON.parse(geometryBytes.toString()) as MapGeometry
const data = JSON.parse(readFileSync('public/map-data/soil-overlay.json', 'utf8')) as SoilData

describe('packaged soil GIS overlay', () => {
  it('splits layers without losing any classifications, geometry or area shares', () => {
    for (const metadata of manifest.layers) {
      const bytes = readFileSync(`public/map-data/${metadata.file}`)
      const split = JSON.parse(bytes.toString()) as SoilData
      expect(metadata.file).toBe(`soil-layer-${createHash('sha256').update(bytes).digest('hex').slice(0, 16)}.json`)
      expect(split.layers).toEqual([data.layers.find((layer) => layer.id === metadata.id)])
      expect(split.sourceGeometrySha256).toBe(data.sourceGeometrySha256)
      expect(split.geometrySha256).toBe(data.geometrySha256)
    }
    const first = readFileSync(`public/map-data/${manifest.layers[0].file}`)
    expect(gzipSync(first).length).toBeLessThan(gzipSync(readFileSync('public/map-data/soil-overlay.json')).length / 5)
  })
  it('matches the shipped map and contains every region in all five layers', () => {
    expect(data.geometrySha256).toBe(createHash('sha256').update(geometryBytes).digest('hex'))
    expect(data.sourceGeometrySha256).toBe(geometry.sourceSha256)
    expect(data.crs).toBe(geometry.crs)
    expect(data.layers.map((layer) => layer.id)).toEqual(['soil_texture', 'flooding', 'active_acid_soil', 'potential_acidsulphat_depth', 'landuse'])
    for (const layer of data.layers) {
      expect(layer.plots.map((plot) => plot.id)).toEqual(geometry.plots.map((plot) => plot.id))
      expect(layer.categories.some((category) => ['-', '**********', ''].includes(category.id))).toBe(false)
      expect(layer.features.every((feature) => layer.plots.some((plot) => plot.id === feature.plotId) && layer.categories.some((category) => category.id === feature.categoryId))).toBe(true)
    }
  })
  it('conserves area and retains partial and completely undetermined regions', () => {
    for (const layer of data.layers) {
      for (const plot of layer.plots) {
        expect(plot.knownAreaHa).toBeGreaterThanOrEqual(0)
        expect(plot.unknownAreaHa).toBeGreaterThanOrEqual(0)
        expect(plot.knownAreaHa + plot.unknownAreaHa).toBeCloseTo(plot.areaHa, 5)
        expect(plot.shares.reduce((sum, share) => sum + share.areaHa, 0)).toBeCloseTo(plot.knownAreaHa, 5)
      }
      expect(layer.plots.some((plot) => plot.knownAreaHa === 0 && plot.unknownAreaHa > 0)).toBe(true)
      expect(layer.plots.some((plot) => plot.knownAreaHa > 0 && plot.unknownAreaHa > .01)).toBe(true)
    }
    expect(data.layers.find((layer) => layer.id === 'flooding')!.categories.some((category) => category.label.vi === 'Không ngập')).toBe(true)
  })
  it('ships translated texture and depth names for both interface languages', () => {
    const texture = data.layers.find((layer) => layer.id === 'soil_texture')!
    expect(texture.categories.find((category) => category.id === 'Clay - Loam')!.label).toEqual({ vi: 'Đất sét – thịt', en: 'Clay – loam soil' })
    expect(texture.categories.find((category) => category.id === 'Loam')!.label).toEqual({ vi: 'Đất thịt', en: 'Loam soil' })
    expect(texture.categories.find((category) => category.id === 'Loam - Clay')!.label).toEqual({ vi: 'Đất thịt – sét', en: 'Loam – clay soil' })
    const flooding = data.layers.find((layer) => layer.id === 'flooding')!
    expect(flooding.categories.find((category) => category.id === '< 0.3 m')!.label).toEqual({ vi: 'Dưới 0,3 m', en: 'Below 0.3 m' })
    for (const layer of data.layers) for (const category of layer.categories) {
      expect(category.label.vi.trim()).not.toBe('')
      expect(category.label.en.trim()).not.toBe('')
    }
  })
})
