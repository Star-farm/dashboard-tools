import fs from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { gzipSync } from 'node:zlib'

// Split without changing coordinates, classifications, or area shares.
const directory = new URL('../public/map-data/', import.meta.url)
const source = JSON.parse(await fs.readFile(new URL('soil-overlay.json', directory), 'utf8'))
const { layers, ...metadata } = source
const manifest = { ...metadata, geometryFile: 'geometry.json', layers: [] }
for (const layer of layers) {
  const json = JSON.stringify({ ...metadata, layers: [layer] })
  const hash = createHash('sha256').update(json).digest('hex').slice(0, 16)
  const file = `soil-layer-${hash}.json`
  await fs.writeFile(new URL(file, directory), json)
  manifest.layers.push({ id: layer.id, title: layer.title, categories: layer.categories, file })
  console.log(`${layer.id}: ${json.length} bytes, gzip ${gzipSync(json).length}`)
}
await fs.writeFile(new URL('../src/data/soil-manifest.json', import.meta.url), JSON.stringify(manifest))
