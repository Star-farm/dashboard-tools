import { readFileSync, writeFileSync } from 'node:fs'
import { aggregateScenarioData } from '../src/features/scenarios/aggregateScenarios.ts'
import { aggregateEconomicOverview } from '../src/features/economics/economicsData.ts'
import { aggregateEconomicComparison } from '../src/features/economics/comparisonData.ts'

const directory = new URL('../src/data/', import.meta.url)
const master = readFileSync(new URL('STAR_FARM CSV - Master file.csv', directory), 'utf8')
const combined = readFileSync(new URL('STAR_FARM CSV - Dữ liệu tổng.csv', directory), 'utf8')
const data = aggregateScenarioData(master, combined)
writeFileSync(new URL('scenario-details.json', directory), JSON.stringify(data, null, 2) + '\n')
console.log(`Scenario data: ${data.scenarios.length} scenarios, ${data.baseline.USD.count} baseline records.`)
const economics = aggregateEconomicOverview(master, combined)
writeFileSync(new URL('economics-overview.json', directory), JSON.stringify(economics, null, 2) + '\n')
console.log(`Economic overview: ${economics.length} scenario rows.`)
const comparison = aggregateEconomicComparison(master, combined)
writeFileSync(new URL('economics-comparison.json', directory), JSON.stringify(comparison, null, 2) + '\n')
console.log(`Economic comparison: ${comparison.cohorts.length} filter combinations.`)
