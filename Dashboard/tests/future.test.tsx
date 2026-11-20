import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import FuturePage from '../src/features/future/FuturePage'
import TimeSeriesChart from '../src/features/future/TimeSeriesChart'
import { aggregateFutureData } from '../src/features/future/aggregate'
import { analyzeChart, laborAxisDomain, selectChartPoints, SERIES_COLORS } from '../src/features/future/chartAnalysis'
import data from '../src/data/future-series.json'

const header = 'datetime,Scenario Group,AWD Adoption,Net Income,Labor Intensity,Methane Emissions\n'
const fixture = header + [
  '2022-02-18,Business As Usual,Without AWD,9999,9999,9999',
  '2027-02-18,1Mha,With AWD,10,300,30',
  '2027-06-18,1Mha,With AWD,30,320,50',
  '2027-06-18,Business As Usual,Without AWD,100,200,90',
  '2028-02-18,1Mha,With AWD,0,280,20',
  '2028-06-18,Business As Usual,Without AWD,-20,190,80',
].join('\n')

describe('annual aggregation', () => {
  it('averages records, keeps groups separate and excludes historical years', () => {
    const result = aggregateFutureData(fixture, fixture)
    expect(result.recordCounts).toEqual({ master: 5, combined: 5 })
    expect(result.annual).toHaveLength(24)
    expect(result.annual[0].year).toBe(2027)
    expect(result.annual[0].incomeUsd).toEqual({ first: 20, second: 100 })
    expect(result.annual[0].labor).toEqual({ first: 310, second: 200 })
    expect(result.annual[0].methane).toEqual({ first: 40, second: 90 })
    expect(result.annual[0].counts).toEqual({ oneMha: 2, bau: 1, withAwd: 2, withoutAwd: 1 })
    expect(result.annual[1].incomeUsd).toEqual({ first: 0, second: -20 })
    expect(result.annual[2].incomeUsd).toEqual({ first: null, second: null })
  })

  it('handles Vietnamese labels and keeps native currency values without conversion', () => {
    const vnd = header + '2027-02-18,1Mha,Sử dụng AWD,50000,310,40\n2027-02-18,Thường lệ,Không có AWD,100000,200,90'
    const result = aggregateFutureData(fixture, vnd)
    expect(result.annual[0].incomeVnd).toEqual({ first: 50000, second: 100000 })
    expect(result.annual[0].incomeUsd).toEqual({ first: 20, second: 100 })
    expect(result.annual[0].labor.first).toBe(310)
  })

  it('ignores blank metrics while preserving zeroes', () => {
    const source = header + '2027-02-18,1Mha,With AWD,,300,0\n2027-06-18,1Mha,With AWD,10,,40'
    const annual = aggregateFutureData(source, source).annual[0]
    expect(annual.incomeUsd.first).toBe(10)
    expect(annual.labor.first).toBe(300)
    expect(annual.methane.first).toBe(20)
    expect(annual.incomeUsd.second).toBeNull()
  })

  it('rejects missing columns, invalid groups and invalid numbers', () => {
    expect(() => aggregateFutureData('datetime\n2027-01-01', fixture)).toThrow(/columns/)
    expect(() => aggregateFutureData(fixture.replace('1Mha', 'Unknown'), fixture)).toThrow(/unknown/)
    expect(() => aggregateFutureData(fixture.replace('10,300,30', 'NaN,300,30'), fixture)).toThrow(/non-finite/)
  })

  it('matches cached output to original CSVs and independently verified endpoint values', () => {
    const master = readFileSync(resolve('src/data', data.sources.USD), 'utf8')
    const combined = readFileSync(resolve('src/data', data.sources.VND), 'utf8')
    expect(aggregateFutureData(master, combined)).toEqual(data)
    expect(data.recordCounts.master).toBe(18984)
    expect(data.annual[0].incomeUsd.first).toBeCloseTo(979.160959760625, 8)
    expect(data.annual[0].incomeVnd.first).toBeCloseTo(25773474.782875, 4)
    expect(data.annual.at(-1)!.labor.first).toBeCloseTo(267.32866683125, 8)
    expect(data.annual.at(-1)!.methane.first).toBeCloseTo(264.384049202995, 8)
  })
})

describe('chart observations', () => {
  it('keeps 1Mha first while reporting higher labor demand truthfully', () => {
    const result = analyzeChart(selectChartPoints(data.annual, 'labor', 'USD', 2027, 2050), 'labor', 'USD', 'vi')!
    expect(result.firstLabel).toBe('1Mha')
    expect(result.difference).toBeGreaterThan(0)
    expect(result.comparison).toContain('1Mha cao hơn Canh tác như thường lệ')
    expect(result.trend).toContain('1Mha giảm')
    expect(result.conclusion).toContain('nhu cầu lao động bình quân cao hơn')
    expect(SERIES_COLORS).toEqual({ first: '#217348', second: '#b8322b' })
  })

  it('groups methane by AWD and derives lower emissions and trends from data', () => {
    const result = analyzeChart(selectChartPoints(data.annual, 'methane', 'USD', 2027, 2050), 'methane', 'USD', 'vi')!
    expect(result.firstLabel).toBe('Có AWD')
    expect(result.comparison).toContain('Có AWD thấp hơn Không có AWD')
    expect(result.trend).toContain('Có AWD giảm')
    expect(result.latest).toContain('2050')
    expect(result.latest).toContain('kg metan/ha')
    expect(result.paragraph).toContain('Có AWD giảm')
    expect(result.paragraph).toContain('Không có AWD giảm')
    expect(result.conclusion).toContain('không tự chứng minh quan hệ nhân quả')
  })

  it('qualifies modeled advantages in both languages', () => {
    const income = selectChartPoints(data.annual, 'income', 'USD', 2027, 2050)
    const methane = selectChartPoints(data.annual, 'methane', 'USD', 2027, 2050)
    expect(analyzeChart(income, 'income', 'USD', 'vi')!.conclusion).toContain('mô phỏng')
    expect(analyzeChart(income, 'income', 'USD', 'en')!.conclusion).toContain('simulation')
    expect(analyzeChart(methane, 'methane', 'USD', 'en')!.conclusion).toContain('does not establish causation')
    const lowerIncome = analyzeChart([{ year: 2027, first: 10, second: 20 }], 'income', 'USD', 'en')!
    expect(lowerIncome.conclusion).toContain('do not show an income advantage')
  })

  it('handles zero/negative baselines, missing values and one-year ranges', () => {
    expect(analyzeChart([{ year: 2027, first: null, second: 1 }], 'income', 'USD', 'en')).toBeNull()
    const single = analyzeChart([{ year: 2027, first: -10, second: 0 }], 'income', 'USD', 'en')!
    expect(single.statistic).not.toMatch(/Infinity|NaN/)
    expect(single.statistic).toBe('-10 USD/ha')
    expect(single.trend).toContain('multiple years')
    expect(analyzeChart([{ year: 2027, first: 5, second: 5 }], 'labor', 'USD', 'en')!.comparison).toContain('equal averages')
  })

  it('compares only years with observations for both groups', () => {
    const result = analyzeChart([{ year: 2027, first: 10, second: 5 }, { year: 2028, first: 100, second: null }, { year: 2029, first: null, second: 50 }], 'income', 'USD', 'en')!
    expect(result.firstMean).toBe(10)
    expect(result.secondMean).toBe(5)
    expect(result.comparison).toContain('1 year')
    expect(analyzeChart([{ year: 2027, first: 10, second: null }, { year: 2028, first: null, second: 5 }], 'income', 'USD', 'en')).toBeNull()
  })

  it('zooms the labor axis around the observed values without clipping either series', () => {
    const points = selectChartPoints(data.annual, 'labor', 'USD', 2027, 2050)
    const [min, max] = laborAxisDomain(points)
    expect(min).toBeGreaterThan(0)
    for (const { first, second } of points) {
      expect(first).toBeGreaterThan(min)
      expect(second).toBeGreaterThan(min)
      expect(first).toBeLessThan(max)
      expect(second).toBeLessThan(max)
    }
    const [singleMin, singleMax] = laborAxisDomain([{ year: 2030, first: 270, second: 270 }])
    expect(singleMin).toBeLessThan(270)
    expect(singleMax).toBeGreaterThan(270)
  })
})

describe('future page interactions', () => {

  it.each([['vi', 'Dự báo giai đoạn 2027–2050'], ['en', 'Projections for 2027–2050']] as const)('shows the localized page title in %s', (language, title) => {
    render(<FuturePage language={language} />)
    expect(screen.getByRole('heading', { level: 1, name: title })).toBeInTheDocument()
    expect(screen.getAllByRole('article').every((article) => article.querySelector('h2')?.textContent?.includes('2027–2050'))).toBe(true)
  })



  it('filters all charts and observations, supports one year and prevents invalid ranges', () => {
    render(<FuturePage language="vi" />)
    fireEvent.change(screen.getByLabelText('Đến năm'), { target: { value: '2030' } })
    fireEvent.change(screen.getByLabelText('Từ năm'), { target: { value: '2030' } })
    expect(within(screen.getByLabelText('Từ năm')).getByRole('option', { name: '2031' })).toBeDisabled()
    expect(within(screen.getByLabelText('Đến năm')).getByRole('option', { name: '2029' })).toBeDisabled()
    for (const article of screen.getAllByRole('article')) {
      expect(article.querySelector('h2')).toHaveTextContent('2030–2030')
      expect(article.querySelector('.chart-insight')).toHaveTextContent('2030–2030')
      expect(article.querySelectorAll('.recharts-line-dots .scenario-dot')).toHaveLength(2)
    }
  })

  it('handles an empty chart without fabricated observations', () => {
    render(<TimeSeriesChart metric="income" points={[]} currency="USD" language="en" />)
    expect(screen.getByText('No data is available for this period.')).toBeInTheDocument()
    expect(screen.queryByText('What the data shows')).not.toBeInTheDocument()
  })

})
