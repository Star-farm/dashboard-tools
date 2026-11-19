import { readFile } from 'node:fs/promises'
import sharp from 'sharp'
import { fileURLToPath } from 'node:url'

const [landShapePath, boundaryShapePath] = process.argv.slice(2)
if (!landShapePath) {
  throw new Error('Usage: node scripts/build-static-basemap.mjs <ne_10m_land.shp> [ne_10m_admin_0_boundary_lines_land.shp]')
}

const outputPath = fileURLToPath(new URL('../public/map-data/static-basemap.jpg', import.meta.url))
const region = { west: 94, south: 4, east: 116, north: 23 }
const width = 4000
const height = 4000
const a = 6378137
const eccentricitySquared = 0.0066943799901413165
const k0 = 0.9996

function project(longitude, latitude) {
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
  return [
    500000 + k0 * n * (alpha + (1 - t + c) * alpha ** 3 / 6
      + (5 - 18 * t + t ** 2 + 72 * c - 58 * (eccentricitySquared / (1 - eccentricitySquared))) * alpha ** 5 / 120),
    k0 * (m + n * tanPhi * (alpha ** 2 / 2
      + (5 - t + 9 * c + 4 * c ** 2) * alpha ** 4 / 24
      + (61 - 58 * t + t ** 2 + 600 * c - 330 * (eccentricitySquared / (1 - eccentricitySquared))) * alpha ** 6 / 720)),
  ]
}

const edgePoints = []
for (let step = 0; step <= 256; step += 1) {
  const fraction = step / 256
  edgePoints.push(project(region.west + (region.east - region.west) * fraction, region.north))
  edgePoints.push(project(region.east, region.north - (region.north - region.south) * fraction))
  edgePoints.push(project(region.east - (region.east - region.west) * fraction, region.south))
  edgePoints.push(project(region.west, region.south + (region.north - region.south) * fraction))
}
const bounds = {
  minX: Math.min(...edgePoints.map(([x]) => x)),
  maxX: Math.max(...edgePoints.map(([x]) => x)),
  minY: Math.min(...edgePoints.map(([, y]) => y)),
  maxY: Math.max(...edgePoints.map(([, y]) => y)),
}
const point = (longitude, latitude) => {
  const [x, y] = project(longitude, latitude)
  return [
    (x - bounds.minX) / (bounds.maxX - bounds.minX) * width,
    (bounds.maxY - y) / (bounds.maxY - bounds.minY) * height,
  ]
}

async function shapePaths(shapePath, types) {
  if (!shapePath) return []
  const shp = await readFile(shapePath)
  const paths = []
  let offset = 100
  while (offset + 8 <= shp.length) {
    const contentBytes = shp.readInt32BE(offset + 4) * 2
    const start = offset + 8
    const shapeType = shp.readInt32LE(start)
    if (types.includes(shapeType) && contentBytes >= 44) {
      const minX = shp.readDoubleLE(start + 4)
      const minY = shp.readDoubleLE(start + 12)
      const maxX = shp.readDoubleLE(start + 20)
      const maxY = shp.readDoubleLE(start + 28)
      if (maxX >= region.west - 1 && minX <= region.east + 1 && maxY >= region.south - 1 && minY <= region.north + 1) {
        const partsCount = shp.readInt32LE(start + 36)
        const pointsCount = shp.readInt32LE(start + 40)
        const pointsOffset = start + 44 + partsCount * 4
        const starts = Array.from({ length: partsCount }, (_, index) => shp.readInt32LE(start + 44 + index * 4))
        starts.push(pointsCount)
        for (let part = 0; part < partsCount; part += 1) {
          let path = ''
          for (let index = starts[part]; index < starts[part + 1]; index += 1) {
            const longitude = shp.readDoubleLE(pointsOffset + index * 16)
            const latitude = shp.readDoubleLE(pointsOffset + index * 16 + 8)
            const [x, y] = point(longitude, latitude)
            path += `${index === starts[part] ? 'M' : 'L'}${x.toFixed(2)} ${y.toFixed(2)}`
          }
          paths.push(`${path}${shapeType === 5 ? 'Z' : ''}`)
        }
      }
    }
    offset += 8 + contentBytes
  }
  return paths
}

const lands = await shapePaths(landShapePath, [5])
const borders = await shapePaths(boundaryShapePath, [3])
const borderLayer = borders.length
  ? `<path d="${borders.join('')}" fill="none" stroke="#c8c3b6" stroke-width="2.4" vector-effect="non-scaling-stroke"/>`
  : ''
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="#c7e3ec"/><path d="${lands.join('')}" fill="#f5f2e8" fill-rule="evenodd"/>${borderLayer}</svg>`

await sharp(Buffer.from(svg))
  .flatten({ background: '#c7e3ec' })
  .jpeg({ quality: 92, chromaSubsampling: '4:4:4', mozjpeg: true })
  .toFile(outputPath)

console.log(`Wrote ${outputPath} (${width}x${height}); projected bounds ${JSON.stringify(bounds)}`)
