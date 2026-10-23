import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { parseCsv } from '../src/utils/csv'
import { aggregateEnvironmentData } from '../src/features/environment/aggregateEnvironment'
import { environmentAwdStats, environmentComparisonInsight, environmentDomain, environmentFilteredSeries, environmentLinePoints, environmentStats, environmentSummary } from '../src/features/environment/environmentAnalysis'
import { environmentMetrics } from '../src/features/environment/environmentTypes'
import type { EnvironmentData } from '../src/features/environment/environmentTypes'
import cached from '../src/data/environment.json'

const data = cached as EnvironmentData
const header = 'datetime,Scenario Code,Scenario Name,Scenario Group,Season Type,Climate Type,Resource Scenario,AWD Adoption,Emission Intensity,Methane Emissions\n'
const fixture = header + [
  '2022-02-18,BASE,Current,Business As Usual,3 Seasons,Mild Climate,Neutral,Without AWD,0.09,9999',
  '2027-02-18,BAU,BAU,Business As Usual,3 Seasons,Mild Climate,Normal Economy,Without AWD,0.1,100',
  '2027-03-18,BAU,BAU,Business As Usual,3 Seasons,Mild Climate,Normal Economy,Without AWD,,300',
  '2050-02-18,BAU,BAU,Business As Usual,3 Seasons,Mild Climate,Normal Economy,With AWD,0,0',
  '2027-02-18,ONE,One,1Mha,Sustainable,Mild Climate,Normal Economy,With AWD,0.05,40',
  '2050-02-18,ONE,One,1Mha,Sustainable,Mild Climate,Normal Economy,With AWD,0.02,20',
].join('\n')

describe('environmental data', () => {
  it('converts intensity to kg CH4 per tonne, preserves zero and null, weights valid observations and excludes history', () => {
    const result = aggregateEnvironmentData(fixture, fixture)
    expect(result.rows[0]).toMatchObject({ historical: true, count: 1, values: { intensity: 90, methane: 9999 } })
    const selected = result.series.filter((series) => series.family === 'bau3s')
    const normal = selected.find((series) => series.condition === 'mildNormal')!
    expect(normal.points[0]).toMatchObject({ year: 2027, count: 2, withAwd: 0, values: { intensity: 100, methane: 200 }, metricCounts: { intensity: 1, methane: 2 } })
    expect(normal.points[1]).toMatchObject({ year: 2028, count: 0, values: { intensity: null, methane: null } })
    expect(normal.points.at(-1)).toMatchObject({ year: 2050, withAwd: 1, values: { intensity: 0, methane: 0 } })
    expect(environmentStats(selected, 'intensity')).toMatchObject({ mean: 50, start: 100, end: 0, change: -100 })
    expect(environmentStats(selected, 'methane').mean).toBeCloseTo(400 / 3)
    expect(environmentLinePoints(result, 'bau3s', 'intensity')[0]).toMatchObject({ year: 2027, mildNormal: 100, severeShortage: null })
    expect(environmentLinePoints(result, 'bau3s', 'methane')).toHaveLength(24)
    expect(environmentAwdStats(selected)).toMatchObject({ start: 0, end: 100, change: 100 })
    expect(environmentAwdStats(selected).mean).toBeCloseTo(100 / 3)
  })

  it('normalizes Vietnamese facets and rejects invalid values, mismatched emissions and AWD populations', () => {
    const translated = fixture.replaceAll('Business As Usual', 'Thường lệ').replaceAll('3 Seasons', '3 vụ').replaceAll('Sustainable', 'Bền vững').replaceAll('Mild Climate', 'Khí hậu ôn hòa').replaceAll('Normal Economy', 'Nền kinh tế bình thường').replaceAll('With AWD', 'Có AWD').replaceAll('Without AWD', 'Không có AWD')
    expect(aggregateEnvironmentData(fixture, translated)).toEqual(aggregateEnvironmentData(fixture, fixture))
    expect(() => aggregateEnvironmentData('datetime\n2027-02-18', fixture)).toThrow(/columns/)
    expect(() => aggregateEnvironmentData(fixture.replace('2027-02-18', 'invalid'), fixture)).toThrow(/date/)
    expect(() => aggregateEnvironmentData(fixture.replace(',0.1,100', ',NaN,100'), fixture)).toThrow(/non-finite/)
    expect(() => aggregateEnvironmentData(fixture.replace(',0.1,100', ',1e308,100'), fixture)).toThrow(/non-finite/)
    expect(() => aggregateEnvironmentData(fixture, fixture.replace(',0.1,100', ',0.1,101'))).toThrow(/different methane/)
    expect(() => aggregateEnvironmentData(fixture, fixture.replace('Without AWD,0.1', 'With AWD,0.1'))).toThrow(/do not match/)
  })

  it('matches both source files, 17 rows, 18984 annual observations and family-specific AWD rates', () => {
    const master = readFileSync(resolve('src/data/STAR_FARM CSV - Master file.csv'), 'utf8')
    const combined = readFileSync(resolve('src/data/STAR_FARM CSV - Dữ liệu tổng.csv'), 'utf8')
    expect(aggregateEnvironmentData(master, combined)).toEqual(data)
    expect(data.rows).toHaveLength(17)
    expect(data.series).toHaveLength(16)
    expect(data.rows[0]).toMatchObject({ historical: true, count: 420, startYear: 2016, endYear: 2022 })
    expect(data.series.flatMap((series) => series.points).reduce((sum, point) => sum + point.count, 0)).toBe(18984)
    for (const family of ['bau3s', 'bau2s', 'bauss', 'oneMha']) {
      expect(environmentAwdStats(data.series.filter((series) => series.family === family)).mean).toBe(family === 'bauss' || family === 'oneMha' ? 100 : 0)
    }
  })

  it.each(['STAR_FARM CSV - Master file.csv', 'STAR_FARM CSV - Dữ liệu tổng.csv'])('matches raw period/endpoint means, scaled intensity and AWD counts in %s', (filename) => {
    const [headers, ...rows] = parseCsv(readFileSync(resolve('src/data', filename), 'utf8'))
    const cell = (row: string[], name: string) => row[headers.indexOf(name)]
    const future = rows.filter((row) => Number(cell(row, 'datetime').slice(0, 4)) >= 2027 && Number(cell(row, 'datetime').slice(0, 4)) <= 2050)
    const models = [
      { family: 'bau3s', season: ['3 Seasons', '3 vụ'], count: 5688 },
      { family: 'bau2s', season: ['2 Seasons', '2 vụ'], count: 3840 },
      { family: 'bauss', season: ['Sustainable', 'Bền vững'], count: 5616 },
      { family: 'oneMha', season: [], count: 3840 },
    ]
    for (const model of models) {
      const selected = future.filter((row) => model.family === 'oneMha' ? cell(row, 'Scenario Group') === '1Mha' : cell(row, 'Scenario Group') !== '1Mha' && model.season.includes(cell(row, 'Season Type')))
      expect(selected).toHaveLength(model.count)
      const series = data.series.filter((series) => series.family === model.family)
      for (const metric of environmentMetrics) {
        const column = metric === 'intensity' ? 'Emission Intensity' : 'Methane Emissions', factor = metric === 'intensity' ? 1000 : 1
        const mean = (records: string[][]) => records.reduce((sum, row) => sum + Number(cell(row, column)) * factor, 0) / records.length
        const start = mean(selected.filter((row) => cell(row, 'datetime').startsWith('2027'))), end = mean(selected.filter((row) => cell(row, 'datetime').startsWith('2050')))
        const stats = environmentStats(series, metric)
        expect(stats.mean).toBeCloseTo(mean(selected), 6)
        expect(stats.start).toBeCloseTo(start, 6)
        expect(stats.end).toBeCloseTo(end, 6)
        expect(stats.change).toBeCloseTo((end - start) / Math.abs(start) * 100, 6)
      }
      const withAwd = selected.filter((row) => ['With AWD', 'Sử dụng AWD', 'Có AWD'].includes(cell(row, 'AWD Adoption'))).length
      expect(environmentAwdStats(series).mean).toBeCloseTo(withAwd / selected.length * 100, 6)
    }
    const sample = future[0]
    expect(Number(cell(sample, 'Emission Intensity')) * 1000).toBeCloseTo(Number(cell(sample, 'Methane Emissions')) / Number(cell(sample, 'Avg Yield')), 5)
  })

  it('combines filters, retains common domains and produces data-driven observations without invalid percentages', () => {
    const selected = environmentFilteredSeries(data, 'severe', 'shortage')
    expect(selected).toHaveLength(4)
    for (const metric of environmentMetrics) {
      const domain = environmentDomain(selected, metric)
      for (const series of selected) for (const point of series.points) {
        expect(point.values[metric]).toBeGreaterThanOrEqual(domain[0])
        expect(point.values[metric]).toBeLessThanOrEqual(domain[1])
      }
      expect(environmentComparisonInsight(data, selected, metric, 'vi')).not.toMatch(/NaN|Infinity|mức sử dụng/)
    }
    expect(environmentSummary(data, data.series, 'vi', undefined, true)).toContain('Tỷ lệ áp dụng AWD')
    expect(environmentAwdStats([])).toMatchObject({ mean: null, start: null, end: null, change: null })
    expect(environmentSummary({ ...data, series: [] }, [], 'en')).toBe('Not enough data.')
    const zero = aggregateEnvironmentData(fixture.replaceAll(',0.1,100', ',0,100'), fixture.replaceAll(',0.1,100', ',0,100'))
    expect(environmentStats(zero.series.filter((series) => series.family === 'bau3s'), 'intensity').change).toBeNull()
    expect(environmentComparisonInsight(zero, zero.series, 'intensity', 'en')).not.toMatch(/NaN|Infinity/)
  })

  it('changes the 1Mha recommendation when its emissions are made higher than BAU', () => {
    const changed = structuredClone(data)
    for (const series of changed.series.filter((series) => series.family === 'oneMha')) for (const point of series.points) point.values.methane = 1e9
    const selected = changed.series.filter((series) => series.family === 'bau3s' || series.family === 'oneMha')
    const insight = environmentComparisonInsight(changed, selected, 'methane', 'vi', 'bau3s')
    expect(insight).toContain('cao hơn ở 4/4 tổ hợp')
    expect(insight).not.toContain('ủng hộ ưu tiên 1Mha')
  })
})
