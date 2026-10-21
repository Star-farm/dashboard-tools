import { readFileSync, writeFileSync } from 'node:fs'
import { aggregateFutureData } from '../src/features/future/aggregate.ts'

const directory = new URL('../src/data/', import.meta.url)
const master = readFileSync(new URL('STAR_FARM CSV - Master file.csv', directory), 'utf8')
const combined = readFileSync(new URL('STAR_FARM CSV - Dữ liệu tổng.csv', directory), 'utf8')
const data = aggregateFutureData(master, combined)
writeFileSync(new URL('future-series.json', directory), JSON.stringify(data, null, 2) + '\n')
console.log(`Future data: ${data.annual.length} years, ${data.recordCounts.master} records per source.`)
