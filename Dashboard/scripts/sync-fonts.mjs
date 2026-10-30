import { mkdir, writeFile } from 'node:fs/promises'

// Run manually when updating the bundled font; normal builds work offline.
const directory = new URL('../src/assets/fonts/', import.meta.url)
await mkdir(directory, { recursive: true })
const response = await fetch('https://fonts.googleapis.com/css2?family=Lora:wght@400..700&display=swap', {
  headers: { 'User-Agent': 'Mozilla/5.0 AppleWebKit/537.36 Chrome/140.0.0.0 Safari/537.36' },
  signal: AbortSignal.timeout(20000),
})
if (!response.ok) throw new Error(`Font stylesheet request failed: ${response.status}`)
const stylesheet = await response.text()
const blocks = [...stylesheet.matchAll(/\/\* (latin|latin-ext|vietnamese) \*\/\s*(@font-face\s*\{[\s\S]*?\})/g)]
if (blocks.length !== 3) throw new Error('Expected Latin, Latin Extended, and Vietnamese font subsets')
const localRules = []
for (const [, subset, rule] of blocks) {
  const url = rule.match(/url\((https:\/\/fonts\.gstatic\.com\/[^)]+\.woff2)\)/)?.[1]
  if (!url) throw new Error(`Missing WOFF2 URL for ${subset}`)
  const font = await fetch(url, { signal: AbortSignal.timeout(20000) })
  if (!font.ok) throw new Error(`Font request failed: ${font.status}`)
  const bytes = Buffer.from(await font.arrayBuffer())
  await writeFile(new URL(`lora-${subset}.woff2`, directory), bytes)
  localRules.push(`/* ${subset} */\n${rule.replace(url, `./lora-${subset}.woff2`)}`)
  console.log(`Lora ${subset}: ${bytes.length} bytes`)
}
const license = await fetch('https://raw.githubusercontent.com/google/fonts/main/ofl/lora/OFL.txt', { signal: AbortSignal.timeout(20000) })
if (!license.ok) throw new Error(`Font license request failed: ${license.status}`)
const licenseText = await license.text()
await writeFile(new URL('OFL.txt', directory), licenseText)
const publicLicenses = new URL('../public/licenses/', import.meta.url)
await mkdir(publicLicenses, { recursive: true })
await writeFile(new URL('lora-OFL.txt', publicLicenses), licenseText)
await writeFile(new URL('lora.css', directory), `${localRules.join('\n\n')}\n`)
