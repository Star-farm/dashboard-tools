import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import App from '../src/app/App'
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
    expect(result.comparison).toContain('1Mha cao hơn Thường lệ')
    expect(result.trend).toContain('1Mha giảm')
    expect(result.conclusion).toContain('đề xuất triển khai 1Mha')
    expect(result.conclusion).toContain('nhu cầu lao động tăng thêm so với thường lệ')
    expect(SERIES_COLORS).toEqual({ first: '#2f8050', second: '#bf554c' })
  })

  it('groups methane by AWD and derives lower emissions and trends from data', () => {
    const result = analyzeChart(selectChartPoints(data.annual, 'methane', 'USD', 2027, 2050), 'methane', 'USD', 'vi')!
    expect(result.firstLabel).toBe('Có AWD')
    expect(result.comparison).toContain('Có AWD thấp hơn Không có AWD')
    expect(result.trend).toContain('Có AWD giảm')
    expect(result.latest).toContain('2050')
    expect(result.latest).toContain('kg CH₄/ha')
    expect(result.paragraph.endsWith(result.conclusion)).toBe(true)
    expect(result.conclusion).toContain('Mức phát thải metan bình quân thấp hơn')
    expect(result.conclusion).toContain('đề xuất ưu tiên AWD')
  })

  it('recommends 1Mha and AWD in both languages when supported by the selected data', () => {
    const income = selectChartPoints(data.annual, 'income', 'USD', 2027, 2050)
    const methane = selectChartPoints(data.annual, 'methane', 'USD', 2027, 2050)
    expect(analyzeChart(income, 'income', 'USD', 'vi')!.conclusion).toContain('ưu tiên áp dụng 1Mha')
    expect(analyzeChart(income, 'income', 'USD', 'en')!.conclusion).toContain('prioritizing 1Mha')
    expect(analyzeChart(methane, 'methane', 'USD', 'en')!.conclusion).toContain('prioritizing AWD')
    const lowerIncome = analyzeChart([{ year: 2027, first: 10, second: 20 }], 'income', 'USD', 'en')!
    expect(lowerIncome.conclusion).toContain('do not show an income advantage')
  })

  it('handles zero/negative baselines, missing values and one-year ranges', () => {
    expect(analyzeChart([{ year: 2027, first: null, second: 1 }], 'income', 'USD', 'en')).toBeNull()
    const single = analyzeChart([{ year: 2027, first: -10, second: 0 }], 'income', 'USD', 'en')!
    expect(single.statistic).not.toMatch(/Infinity|NaN/)
    expect(single.statistic).toBe('-10 $/ha')
    expect(single.trend).toContain('multiple years')
    expect(analyzeChart([{ year: 2027, first: 5, second: 5 }], 'labor', 'USD', 'en')!.comparison).toContain('equal period averages')
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
  it('renders straight lines, annual dots and one analysis paragraph, with currency following language', async () => {
    const { container, rerender } = render(<FuturePage language="vi" />)
    await waitFor(() => expect(container.querySelectorAll('path.recharts-line-curve')).toHaveLength(6))
    expect(container.querySelectorAll('circle.recharts-line-dot')).toHaveLength(144)
    expect(screen.getAllByRole('article')).toHaveLength(3)
    for (const article of screen.getAllByRole('article')) {
      expect([...article.querySelectorAll('path.recharts-line-curve')].map((path) => path.getAttribute('stroke'))).toEqual([SERIES_COLORS.first, SERIES_COLORS.second])
      for (const path of article.querySelectorAll('path.recharts-line-curve')) {
        expect(path.getAttribute('d')).not.toMatch(/[CQ]/)
        expect(path).not.toHaveAttribute('stroke-dasharray')
      }
      expect(article.querySelectorAll('.chart-insight > p')).toHaveLength(1)
    }
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
    expect(screen.queryByText(/Màu nhận diện cố định/)).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Cách đọc & nguồn dữ liệu' })).not.toBeInTheDocument()
    const income = screen.getByRole('article', { name: 'Thu nhập ròng trung bình' })
    expect(within(income).getByText('Đơn vị: VNĐ/ha')).toBeInTheDocument()
    expect(income.querySelector('.chart-insight')).toHaveTextContent('25.773.475 VNĐ/ha')
    const labor = screen.getByRole('article', { name: 'Cường độ lao động trung bình' })
    expect(within(labor).getByText(/1Mha cao hơn Thường lệ/)).toBeInTheDocument()
    expect([...labor.querySelectorAll('path.recharts-line-curve')].map((path) => path.getAttribute('stroke'))).toEqual([SERIES_COLORS.first, SERIES_COLORS.second])
    expect(within(labor).getByText('Đơn vị: giờ/ha')).toBeInTheDocument()
    expect(labor.querySelector('.recharts-yAxis')).not.toHaveTextContent(/^0$/)
    rerender(<FuturePage language="en" />)
    expect(within(income).getByText('Unit: $/ha')).toBeInTheDocument()
    expect(income.querySelector('.chart-insight')).toHaveTextContent('979.16 $/ha')
    expect(income.querySelector('.chart-insight')).not.toHaveTextContent('VNĐ')
    rerender(<FuturePage language="vi" />)
    expect(within(income).getByText('Đơn vị: VNĐ/ha')).toBeInTheDocument()
  })

  it('shows both scenario values and units for the hovered year and updates on movement', async () => {
    const points = [{ year: 2027, first: 20, second: 100 }, { year: 2028, first: 30, second: 80 }]
    const { container } = render(<TimeSeriesChart metric="income" points={points} currency="USD" language="en" />)
    await waitFor(() => expect(container.querySelectorAll('circle.recharts-line-dot')).toHaveLength(4))
    const wrapper = container.querySelector<HTMLElement>('.recharts-wrapper')!
    Object.defineProperty(wrapper, 'offsetWidth', { value: 800 })
    Object.defineProperty(wrapper, 'offsetHeight', { value: 310 })
    vi.spyOn(wrapper, 'getBoundingClientRect').mockReturnValue({ x: 0, y: 0, left: 0, top: 0, width: 800, height: 310, right: 800, bottom: 310, toJSON: () => ({}) })
    const dots = container.querySelectorAll('circle.recharts-line-dot')
    const hover = (dot: Element) => fireEvent.mouseMove(dot, { clientX: Number(dot.getAttribute('cx')), clientY: Number(dot.getAttribute('cy')) })
    hover(dots[0])
    const tooltip = container.querySelector('.recharts-tooltip-wrapper')!
    await waitFor(() => expect(tooltip).toHaveTextContent('Year 2027'))
    expect(tooltip).toHaveStyle({ visibility: 'visible' })
    expect(tooltip).toHaveTextContent('1Mha : 20 $/ha')
    expect(tooltip).toHaveTextContent('Business as usual : 100 $/ha')
    hover(dots[1])
    await waitFor(() => expect(tooltip).toHaveTextContent('Year 2028'))
    expect(tooltip).toHaveTextContent('1Mha : 30 $/ha')
    expect(tooltip).toHaveTextContent('Business as usual : 80 $/ha')
  })

  it('filters all charts and observations, supports one year and prevents invalid ranges', () => {
    render(<FuturePage language="vi" />)
    fireEvent.change(screen.getByLabelText('Đến năm'), { target: { value: '2030' } })
    fireEvent.change(screen.getByLabelText('Từ năm'), { target: { value: '2030' } })
    expect(within(screen.getByLabelText('Từ năm')).getByRole('option', { name: '2031' })).toBeDisabled()
    expect(within(screen.getByLabelText('Đến năm')).getByRole('option', { name: '2029' })).toBeDisabled()
    for (const article of screen.getAllByRole('article')) {
      expect(article.querySelector('.chart-insight')).toHaveTextContent('Năm 2030:')
      expect(article.querySelector('.chart-insight')).toHaveTextContent('Chọn nhiều năm để theo dõi xu hướng thay đổi.')
      expect(article.querySelectorAll('circle.recharts-line-dot')).toHaveLength(2)
    }
  })

  it('handles an empty chart without fabricated observations', () => {
    render(<TimeSeriesChart metric="income" points={[]} currency="USD" language="en" />)
    expect(screen.getByText('No data is available for this period.')).toBeInTheDocument()
    expect(screen.queryByText('What the data shows')).not.toBeInTheDocument()
  })

  it('opens a deep link and changes currency with language while preserving years', async () => {
    window.history.replaceState(null, '', '#future')
    render(<App />)
    expect(await screen.findByRole('heading', { name: 'Về tương lai' })).toBeInTheDocument()
    expect(document.title).toBe('Về tương lai | STAR FARM')
    expect(screen.getByText('Đơn vị: VNĐ/ha')).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Từ năm'), { target: { value: '2035' } })
    fireEvent.click(screen.getByRole('button', { name: 'English' }))
    expect(screen.getByRole('heading', { name: 'About future' })).toBeInTheDocument()
    expect(screen.getByText('Unit: $/ha')).toBeInTheDocument()
    expect(screen.getByLabelText('From year')).toHaveValue('2035')
    expect(screen.getByRole('article', { name: 'Average methane emissions' })).toBeInTheDocument()
    expect(document.title).toBe('About future | STAR FARM')
    fireEvent.click(within(screen.getByRole('navigation', { name: 'Main menu' })).getByRole('link', { name: 'Home' }))
    expect(await screen.findByRole('heading', { name: /The impact of the/ })).toBeInTheDocument()
  })
})
