import { readFileSync, writeFileSync } from 'node:fs'
import { aggregateScenarioData } from '../src/features/scenarios/aggregateScenarios.ts'
import { aggregateEconomicOverview } from '../src/features/economics/economicsData.ts'
import { aggregateEconomicComparison } from '../src/features/economics/comparisonData.ts'
import { aggregateBau3Data, aggregateBauComparisonData } from '../src/features/economics/aggregateBau3.ts'
import { aggregateResourceData } from '../src/features/resources/aggregateResources.ts'
import { aggregateEnvironmentData } from '../src/features/environment/aggregateEnvironment.ts'

const directory = new URL('../src/data/', import.meta.url)
const master = readFileSync(new URL('STAR_FARM CSV - Master file.csv', directory), 'utf8')
const combined = readFileSync(new URL('STAR_FARM CSV - Dữ liệu tổng.csv', directory), 'utf8')
const environment = aggregateEnvironmentData(master, combined)
writeFileSync(new URL('environment.json', directory), JSON.stringify(environment, null, 2) + '\n')
console.log(`Environment: ${environment.rows.length} scenario rows, ${environment.series.length} annual series.`)
const resources = aggregateResourceData(master, combined)
writeFileSync(new URL('resources.json', directory), JSON.stringify(resources, null, 2) + '\n')
console.log(`Resources: ${resources.rows.length} scenario rows, ${resources.series.length} annual series.`)
const data = aggregateScenarioData(master, combined)
writeFileSync(new URL('scenario-details.json', directory), JSON.stringify(data, null, 2) + '\n')
console.log(`Scenario data: ${data.scenarios.length} scenarios, ${data.baseline.USD.count} baseline records.`)
const economics = aggregateEconomicOverview(master, combined)
writeFileSync(new URL('economics-overview.json', directory), JSON.stringify(economics, null, 2) + '\n')
console.log(`Economic overview: ${economics.length} scenario rows.`)
const comparison = aggregateEconomicComparison(master, combined)
writeFileSync(new URL('economics-comparison.json', directory), JSON.stringify(comparison, null, 2) + '\n')
console.log(`Economic comparison: ${comparison.cohorts.length} filter combinations.`)
const bau3 = aggregateBau3Data(master, combined)
writeFileSync(new URL('economics-bau3-series.json', directory), JSON.stringify(bau3, null, 2) + '\n')
console.log(`BAU 3S comparison: ${bau3.series.length} annual series.`)
for (const [variant, filename] of [['bau2s', 'economics-bau2-series.json'], ['bauss', 'economics-bauss-series.json']]) {
  const comparison = aggregateBauComparisonData(master, combined, variant)
  writeFileSync(new URL(filename, directory), JSON.stringify(comparison, null, 2) + '\n')
  console.log(`${variant} comparison: ${comparison.series.length} annual series.`)
}
