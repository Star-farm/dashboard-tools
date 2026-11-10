import fs from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { gzipSync } from 'node:zlib'
const dir = new URL('../public/map-data/', import.meta.url)
const manifest = JSON.parse(await fs.readFile(new URL('manifest.json', dir)))
const inputs = await Promise.all(manifest.scenarios.map(async (s) => JSON.parse(await fs.readFile(new URL(s.file, dir)))))
const groups = [manifest.scenarios, manifest.scenarios.filter(s => s.system !== 'oneMha'), ...['bau3','bau2','bauss','oneMha'].map(system => manifest.scenarios.filter(s => s.system === system)), manifest.scenarios.filter(s => s.seasons === 3)]
const aggregates = {}
for (const scenarios of groups) {
  const source = scenarios.map(s => inputs[manifest.scenarios.indexOf(s)])
  const allRecords = source.flatMap(s => s.records)
  const records = []
  for (let year = manifest.yearStart; year <= manifest.yearEnd; year++) for (let season = 1; season <= 3; season++) {
    const selected = allRecords.filter(r => r.year === year && r.season === season)
    if (!selected.length) continue
    const item = {year, season, runs: 0, dates: []}
    for (const metric of ['yield','income']) {
      const values = [], counts = []
      for (let plot = 0; plot < manifest.plotCount; plot++) {
        let sum = 0, count = 0
        for (const record of selected) {
          const value = record[metric][plot], n = record[`${metric}Counts`]?.[plot] ?? record.runs
          if (value !== null && n > 0) {sum += value * n; count += n}
        }
        values.push(count ? sum / count : null); counts.push(count)
      }
      item[metric] = values; item[`${metric}Counts`] = counts
    }
    records.push(item)
  }
  const breaks = Object.fromEntries(['yield','income'].map(metric => {
    const sorted = allRecords.flatMap(r => r[metric]).filter(v => v !== null && Number.isFinite(v)).sort((a,b) => a-b)
    return [metric, [0,.2,.4,.6,.8,1].map(q => sorted[Math.floor(q*(sorted.length-1))])]
  }))
  const key = scenarios.map(s => s.file).sort().join('|')
  const result = {id: scenarios.map(s => s.id).join('+'), runs: source.reduce((n,s)=>n+s.runs,0), records, seeds: {}, sourceRows: source.reduce((n,s)=>n+s.sourceRows,0), breaks}
  const json = JSON.stringify(result)
  const hash = createHash('sha256').update(json).digest('hex').slice(0,16)
  const filename = `aggregate-${hash}.json`
  await fs.writeFile(new URL(filename, dir), json)
  aggregates[key] = filename
  console.log(`${scenarios.length} scenarios: ${filename} ${json.length} bytes, gzip ${gzipSync(json).length}`)
}
manifest.aggregates = aggregates
await fs.writeFile(new URL('manifest.json', dir), JSON.stringify(manifest))
