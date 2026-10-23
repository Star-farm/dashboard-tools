import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { parseCsv } from '../src/utils/csv'
import { aggregateResourceData } from '../src/features/resources/aggregateResources'
import { resourceDomain, resourceFilteredSeries, resourceLinePoints, resourceMean, resourceStats, resourceComparisonInsight, resourceSummary } from '../src/features/resources/resourceAnalysis'
import { resourceMetrics } from '../src/features/resources/resourceTypes'
import type { ResourceData } from '../src/features/resources/resourceTypes'
import cached from '../src/data/resources.json'

const data = cached as ResourceData
const header = 'datetime,Scenario Code,Scenario Name,Scenario Group,Season Type,Climate Type,Resource Scenario,AWD Adoption,Water Usage,Fertilizer Usage,Pesticide Usage\n'
const fixture = header + [
  '2022-02-18,BASE,Current,Business As Usual,3 Seasons,Mild Climate,Neutral,Without AWD,9999,9999,9999',
  '2027-02-18,BAU,BAU,Business As Usual,3 Seasons,Mild Climate,Normal Economy,Without AWD,100,10,2',
  '2027-03-18,BAU,BAU,Business As Usual,3 Seasons,Mild Climate,Normal Economy,Without AWD,,30,4',
  '2050-02-18,BAU,BAU,Business As Usual,3 Seasons,Mild Climate,Normal Economy,Without AWD,0,20,0',
  '2027-02-18,ONE,One,1Mha,Sustainable,Mild Climate,Normal Economy,With AWD,40,5,1',
  '2050-02-18,ONE,One,1Mha,Sustainable,Mild Climate,Normal Economy,With AWD,20,4,0',
].join('\n')

describe('resource data aggregation', () => {
  it('preserves zeroes and missing metrics, excludes history from annual series and weights each metric by its valid record count', () => {
    const result = aggregateResourceData(fixture, fixture)
    expect(result.rows[0]).toMatchObject({ historical: true, count: 1, values: { water: 9999 } })
    const series = result.series.filter((item) => item.family === 'bau3s')
    const normal = series.find((item) => item.condition === 'mildNormal')!
    expect(normal.points[0]).toMatchObject({ year: 2027, count: 2, values: { water: 100, fertilizer: 20, pesticides: 3 }, metricCounts: { water: 1, fertilizer: 2, pesticides: 2 } })
    expect(normal.points[1]).toMatchObject({ year: 2028, count: 0, values: { water: null } })
    expect(normal.points.at(-1)).toMatchObject({ year: 2050, values: { water: 0, pesticides: 0 } })
    expect(resourceStats(series, 'water')).toMatchObject({ mean: 50, start: 100, end: 0, change: -100 })
    expect(resourceStats(series, 'fertilizer').mean).toBe(20)
    expect(resourceLinePoints(result, 'bau3s', 'water')[0]).toMatchObject({ year: 2027, mildNormal: 100, severeShortage: null })
    expect(resourceLinePoints(result, 'bau3s', 'water')).toHaveLength(24)
  })

  it('recognizes Vietnamese categories and rejects missing columns, invalid dates, non-finite values and mismatched physical data', () => {
    const translated = fixture.replaceAll('Business As Usual', 'Thường lệ').replaceAll('3 Seasons', '3 vụ').replaceAll('Sustainable', 'Bền vững').replaceAll('Mild Climate', 'Khí hậu ôn hòa').replaceAll('Normal Economy', 'Nền kinh tế bình thường').replaceAll('With AWD', 'Có AWD').replaceAll('Without AWD', 'Không có AWD')
    expect(aggregateResourceData(fixture, translated)).toEqual(aggregateResourceData(fixture, fixture))
    expect(() => aggregateResourceData('datetime\n2027-02-18', fixture)).toThrow(/columns/)
    expect(() => aggregateResourceData(fixture.replace('2027-02-18', 'invalid'), fixture)).toThrow(/date/)
    expect(() => aggregateResourceData(fixture.replace(',100,10,2', ',NaN,10,2'), fixture)).toThrow(/non-finite/)
    expect(() => aggregateResourceData(fixture, fixture.replace(',100,10,2', ',101,10,2'))).toThrow(/different water/)
    expect(() => aggregateResourceData(fixture.replaceAll('Mild Climate', 'Unknown'), fixture)).toThrow(/category/)
  })

  it('matches both CSV sources, 17 scenario snapshots and 18984 future observations', () => {
    const master = readFileSync(resolve('src/data/STAR_FARM CSV - Master file.csv'), 'utf8')
    const combined = readFileSync(resolve('src/data/STAR_FARM CSV - Dữ liệu tổng.csv'), 'utf8')
    expect(aggregateResourceData(master, combined)).toEqual(data)
    expect(data.rows).toHaveLength(17)
    expect(data.series).toHaveLength(16)
    expect(data.rows[0]).toMatchObject({ historical: true, count: 420, startYear: 2016, endYear: 2022 })
    expect(data.series.flatMap((series) => series.points).reduce((sum, point) => sum + point.count, 0)).toBe(18984)
  })

  it.each(['STAR_FARM CSV - Master file.csv', 'STAR_FARM CSV - Dữ liệu tổng.csv'])('matches independent raw means and endpoint changes for every family in %s', (filename) => {
    const [headers, ...rows] = parseCsv(readFileSync(resolve('src/data', filename), 'utf8'))
    const cell = (row: string[], name: string) => row[headers.indexOf(name)]
    const future = rows.filter((row) => Number(cell(row, 'datetime').slice(0, 4)) >= 2027 && Number(cell(row, 'datetime').slice(0, 4)) <= 2050)
    const columns = { water: 'Water Usage', fertilizer: 'Fertilizer Usage', pesticides: 'Pesticide Usage' }
    const models = [
      { family: 'bau3s', season: ['3 Seasons', '3 vụ'], count: 5688 },
      { family: 'bau2s', season: ['2 Seasons', '2 vụ'], count: 3840 },
      { family: 'bauss', season: ['Sustainable', 'Bền vững'], count: 5616 },
      { family: 'oneMha', season: [], count: 3840 },
    ]
    for (const model of models) {
      const selected = future.filter((row) => model.family === 'oneMha' ? cell(row, 'Scenario Group') === '1Mha' : cell(row, 'Scenario Group') !== '1Mha' && model.season.includes(cell(row, 'Season Type')))
      expect(selected).toHaveLength(model.count)
      for (const metric of resourceMetrics) {
        const mean = (records: string[][]) => records.reduce((sum, row) => sum + Number(cell(row, columns[metric])), 0) / records.length
        const stats = resourceStats(data.series.filter((series) => series.family === model.family), metric)
        expect(stats.mean).toBeCloseTo(mean(selected), 6)
        const start = mean(selected.filter((row) => cell(row, 'datetime').startsWith('2027'))), end = mean(selected.filter((row) => cell(row, 'datetime').startsWith('2050')))
        expect(stats.start).toBeCloseTo(start, 6)
        expect(stats.end).toBeCloseTo(end, 6)
        expect(stats.change).toBeCloseTo((end - start) / Math.abs(start) * 100, 6)
      }
    }
    for (const row of data.rows) {
      const selected = rows.filter((record) => cell(record, 'Scenario Code') === row.code && Number(cell(record, 'datetime').slice(0, 4)) >= row.startYear && Number(cell(record, 'datetime').slice(0, 4)) <= row.endYear)
      for (const metric of resourceMetrics) expect(row.values[metric]).toBeCloseTo(selected.reduce((sum, record) => sum + Number(cell(record, columns[metric])), 0) / selected.length, 6)
    }
  })

  it('combines weather and resource filters, retains common plot domains and handles empty/zero baselines', () => {
    const filtered = resourceFilteredSeries(data, 'severe', 'shortage')
    expect(filtered).toHaveLength(4)
    expect(filtered.every((series) => series.condition === 'severeShortage')).toBe(true)
    for (const metric of resourceMetrics) {
      const domain = resourceDomain(filtered, metric)
      for (const series of filtered) for (const point of series.points) {
        expect(point.values[metric]).toBeGreaterThanOrEqual(domain[0])
        expect(point.values[metric]).toBeLessThanOrEqual(domain[1])
      }
      expect(resourceComparisonInsight(data, filtered, metric, 'vi')).not.toMatch(/NaN|Infinity/)
    }
    const empty = { ...data, series: [] }
    expect(resourceMean([], 'water')).toBeNull()
    expect(resourceDomain([], 'water')).toEqual([0, 1])
    expect(resourceSummary(empty, [], 'en')).not.toMatch(/NaN|Infinity/)
    const zero = aggregateResourceData(fixture.replaceAll(',100,10,2', ',0,10,2'), fixture.replaceAll(',100,10,2', ',0,10,2'))
    expect(resourceComparisonInsight(zero, zero.series, 'water', 'en')).not.toMatch(/NaN|Infinity/)
  })
})
