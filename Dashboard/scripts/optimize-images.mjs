import sharp from 'sharp'
import { mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const input = new URL('../src/assets/mekong-landscape.jpg', import.meta.url)
const output = new URL('../src/assets/hero/', import.meta.url)
await mkdir(output, { recursive: true })

// The mobile hero is taller than it is wide. A centered square preserves
// the existing object-fit: cover composition without shipping its hidden sides.
for (const [name, widths, square] of [
  ['landscape', [1280, 1920, 2560], false],
  ['mobile', [640, 960, 1280], true],
]) {
  for (const width of widths) {
    const filename = `${name}-${width}.webp`
    const result = await sharp(fileURLToPath(input))
      .resize({ width, ...(square ? { height: width, fit: 'cover', position: 'centre' } : {}), withoutEnlargement: true })
      .webp({ quality: 80, effort: 5 })
      .toFile(fileURLToPath(new URL(filename, output)))
    console.log(`${filename}: ${result.width} x ${result.height}, ${(result.size / 1000).toFixed(1)} kB`)
  }
}
