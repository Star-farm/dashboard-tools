import { readFileSync, writeFileSync } from 'node:fs'
import { aggregateScenarioData } from '../src/features/scenarios/aggregateScenarios.ts'

const directory = new URL('../src/data/', import.meta.url)
const master = readFileSync(new URL('STAR_FARM CSV - Master file.csv', directory), 'utf8')
const combined = readFileSync(new URL('STAR_FARM CSV - Dữ liệu tổng.csv', directory), 'utf8')
const data = aggregateScenarioData(master, combined)
writeFileSync(new URL('scenario-details.json', directory), JSON.stringify(data, null, 2) + '\n')
console.log(`Scenario data: ${data.scenarios.length} scenarios, ${data.baseline.USD.count} baseline records.`)
