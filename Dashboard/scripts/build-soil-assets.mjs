import fs from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { gzipSync } from 'node:zlib'
import sharp from 'sharp'
import { fileURLToPath } from 'node:url'


const directory = new URL('../public/map-data/', import.meta.url)
const source = JSON.parse(await fs.readFile(new URL('soil-overlay.json', directory), 'utf8'))
const { layers, ...metadata } = source
const manifest = { ...metadata, geometryFile: 'geometry.json', layers: [] }
for (const layer of layers) {


  const browserLayer = layer.id === 'landuse' ? { ...layer, features: [] } : layer
  const json = JSON.stringify({ ...metadata, layers: [browserLayer] })
  const hash = createHash('sha256').update(json).digest('hex').slice(0, 16)
  const file = `soil-layer-${hash}.json`
  await fs.writeFile(new URL(file, directory), json)
  let rasterFile
  if (layer.id === 'landuse') {
    const geometry = JSON.parse(await fs.readFile(new URL('geometry.json', directory), 'utf8'))
    const colors = new Map(layer.categories.map((category) => [category.id, category.color]))
    const paths = geometry.plots.map((plot) => `<path d="${plot.path}" fill="#A9ADB4" fill-rule="evenodd"/>`).join('') + layer.features.map((feature) => `<path d="${feature.path}" fill="${colors.get(feature.categoryId)}" fill-rule="evenodd"/>`).join('')
    const width = 3072
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${Math.ceil(width * geometry.height / geometry.width)}" viewBox="0 0 ${geometry.width} ${geometry.height}">${paths}</svg>`
    const rasterHash = createHash('sha256').update(svg).digest('hex').slice(0, 16)
    rasterFile = `landuse-${width}-${rasterHash}.webp`
    await sharp(Buffer.from(svg)).webp({ lossless: true }).toFile(fileURLToPath(new URL(rasterFile, directory)))
  }
  manifest.layers.push({ id: layer.id, title: layer.title, categories: layer.categories, file, ...(rasterFile ? { rasterFile } : {}) })
  console.log(`${layer.id}: ${json.length} bytes, gzip ${gzipSync(json).length}`)
}
await fs.writeFile(new URL('../src/data/soil-manifest.json', import.meta.url), JSON.stringify(manifest))
