import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import App from '../src/app/App'
import HeaderNavigation from '../src/app/HeaderNavigation'
import Bau3ComparisonPage from '../src/features/economics/Bau3ComparisonPage'
import Bau3LineChart from '../src/features/economics/Bau3LineChart'
import { aggregateBau3Data } from '../src/features/economics/aggregateBau3'
import { analyzeBau3, bau3Domain, selectBau3Points } from '../src/features/economics/bau3Analysis'
import type { Bau3Data } from '../src/features/economics/bau3Types'
import cached from '../src/data/economics-bau3-series.json'

const data = cached as Bau3Data
const header = 'datetime,Scenario Group,Season Type,Climate Type,Resource Scenario,Net Income,Avg Yield,Labor Intensity,Production Cost,Profit Margin\n'
function fixture(multiplier = 1) {
  const row = (year: number, group: string, season: string, income: number, cost: number, yieldValue = 6, labor = 100, margin = 30) => `${year}-02-18,${group},${season},Mild Climate,Normal Economy,${income * multiplier},${yieldValue},${labor},${cost * multiplier},${margin}`
  return header + [
    row(2022, 'Business As Usual', '3 Seasons', 9999, 1),
    row(2026, 'Business As Usual', '3 Seasons', 9999, 1),
    row(2027, 'Business As Usual', '2 Seasons', 9999, 1),
    row(2027, 'Business As Usual', 'Sustainable', 9999, 1),
    row(2027, 'Business As Usual', '3 Seasons', 10, 20, 5, 100, 30),
    row(2027, 'Business As Usual', '3 Seasons', 30, 60, 7, 120, 40),
    row(2027, '1Mha', '2 Seasons', 40, 20, 6, 90, 45),
    row(2027, '1Mha', '2 Seasons', 60, 40, 8, 110, 55),
    row(2050, 'Business As Usual', '3 Seasons', -10, 0),
    row(2050, '1Mha', '2 Seasons', 0, 10),
  ].join('\n')
}

describe('BAU 3 seasons data and observations', () => {
  it('selects only BAU 3 seasons and 1Mha, averages each year and preserves missing years, zeroes and negatives', () => {
    const result = aggregateBau3Data(fixture(), fixture(1000))
    expect(result.series).toHaveLength(8)
    const bau = result.series.find((series) => series.family === 'bau3s' && series.condition === 'mildNormal')!
    expect(bau.USD).toHaveLength(24)
    expect(bau.USD[0]).toMatchObject({ year: 2027, count: 2, income: 20, cost: 40, yield: 6, labor: 110, margin: 35 })
    expect(bau.VND[0].income).toBe(20000)
    expect(bau.USD[1]).toMatchObject({ year: 2028, count: 0, income: null })
    expect(bau.USD.at(-1)).toMatchObject({ year: 2050, income: -10, cost: 0 })
    const points = selectBau3Points(result, 'oneMha', 'income', 'USD')
    expect(points[0]).toMatchObject({ year: 2027, mildNormal: 50, severeShortage: null })
    expect(points.at(-1)!.mildNormal).toBe(0)
    const missing = aggregateBau3Data(fixture().replaceAll(',6,100,', ',6,,'), fixture())
    expect(missing.series.find((series) => series.family === 'bau3s' && series.condition === 'mildNormal')!.USD.at(-1)!.labor).toBeNull()
  })

  it('recognizes Vietnamese categories and rejects invalid data and unmatched source populations', () => {
    const vietnamese = fixture(1000).replaceAll('Business As Usual', 'Thường lệ').replaceAll('3 Seasons', '3 vụ').replaceAll('2 Seasons', '2 vụ').replaceAll('Sustainable', 'Bền vững').replaceAll('Mild Climate', 'Khí hậu ôn hòa').replaceAll('Normal Economy', 'Nền kinh tế bình thường')
    expect(aggregateBau3Data(fixture(), vietnamese)).toEqual(aggregateBau3Data(fixture(), fixture(1000)))
    expect(() => aggregateBau3Data('datetime\n2027-01-01', fixture())).toThrow(/columns/)
    expect(() => aggregateBau3Data(fixture().replace('2027-02-18', 'invalid'), fixture())).toThrow(/date/)
    expect(() => aggregateBau3Data(fixture().replace(',10,5,100,20,', ',NaN,5,100,20,'), fixture())).toThrow(/non-finite/)
    expect(() => aggregateBau3Data(fixture().replaceAll('Mild Climate', 'Unknown'), fixture())).toThrow(/weather/)
    expect(() => aggregateBau3Data(fixture(), fixture().replace('2050-02-18,1Mha', '2022-02-18,1Mha'))).toThrow(/do not match/)
  })

  it('matches source CSVs and independently verified endpoints from the reference plots', () => {
    const master = readFileSync(resolve('src/data/STAR_FARM CSV - Master file.csv'), 'utf8')
    const combined = readFileSync(resolve('src/data/STAR_FARM CSV - Dữ liệu tổng.csv'), 'utf8')
    expect(aggregateBau3Data(master, combined)).toEqual(data)
    const bau = data.series.find((series) => series.family === 'bau3s' && series.condition === 'severeShortage')!
    const one = data.series.find((series) => series.family === 'oneMha' && series.condition === 'severeShortage')!
    expect(bau.USD[0].income).toBeCloseTo(593.42550470, 6)
    expect(bau.USD.at(-1)!.income).toBeCloseTo(37.55410908, 6)
    expect(one.USD.at(-1)!.income).toBeCloseTo(627.99633347, 6)
    expect(one.USD.at(-1)!.yield).toBeCloseTo(5.583027896, 6)
    expect(one.USD.at(-1)!.labor).toBeCloseTo(243.70708165, 6)
    expect(bau.USD.at(-1)!.margin).toBeCloseTo(2.72936471, 6)
    expect(one.USD.at(-1)!.margin).toBeCloseTo(30.79774891, 6)
    expect(data.series.reduce((sum, series) => sum + series.USD.reduce((total, point) => total + point.count, 0), 0)).toBe(9528)
  })

  it('reports economic benefits and trade-offs, uses pp for margins and changes conclusions with the data', () => {
    const income = analyzeBau3(data, 'income', 'vi')!
    expect(income).toMatchObject({ higher: 4, lower: 0, count: 4 })
    expect(income.paragraph).toContain('81,3–151,4')
    expect(income.conclusion).toContain('nên ưu tiên 1Mha')
    expect(analyzeBau3(data, 'cost', 'vi')!.conclusion).toContain('dự trù vốn cao hơn')
    expect(analyzeBau3(data, 'yield', 'vi')).toMatchObject({ higher: 2, lower: 2 })
    expect(analyzeBau3(data, 'labor', 'vi')).toMatchObject({ higher: 2, lower: 2 })
    expect(analyzeBau3(data, 'margin', 'vi')!.paragraph).toContain('điểm %')
    expect(analyzeBau3(data, 'margin', 'en')!.paragraph).toContain('pp')
    const changed = structuredClone(data)
    for (const series of changed.series.filter((series) => series.family === 'oneMha')) for (const currency of ['USD', 'VND'] as const) for (const point of series[currency]) point.income = -100
    expect(analyzeBau3(changed, 'income', 'vi')).toMatchObject({ higher: 0, lower: 4 })
    expect(analyzeBau3(changed, 'income', 'vi')!.conclusion).not.toContain('nên ưu tiên 1Mha')
    expect(analyzeBau3({ ...data, series: [] }, 'income', 'vi')).toBeNull()
  })

  it('chooses common domains containing every condition and retains zero or negatives for financial metrics', () => {
    for (const metric of ['income', 'cost', 'margin', 'yield', 'labor'] as const) {
      const [min, max] = bau3Domain(data, metric, 'USD')
      for (const series of data.series) for (const point of series.USD) {
        expect(point[metric]).toBeGreaterThanOrEqual(min)
        expect(point[metric]).toBeLessThanOrEqual(max)
      }
      if (['income', 'cost', 'margin'].includes(metric)) expect(min).toBe(0)
    }
    expect(bau3Domain(data, 'labor', 'USD')[0]).toBeGreaterThan(200)
    expect(bau3Domain(aggregateBau3Data(fixture(), fixture()), 'income', 'USD')[0]).toBeLessThan(-10)
    expect(bau3Domain({ ...data, series: [] }, 'income', 'USD')).toEqual([0, 1])
  })
})

describe('BAU 3 seasons comparison page', () => {
  it('renders five combined charts, observations, straight lines and yearly dots in the existing template', () => {
    render(<Bau3ComparisonPage language="vi" />)
    expect(screen.getByRole('heading', { name: 'BAU 3 vụ so với 1Mha' })).toBeInTheDocument()
    expect(screen.getAllByRole('article')).toHaveLength(5)
    expect(screen.getAllByRole('complementary')).toHaveLength(5)
    const income = screen.getByRole('region', { name: 'Thu nhập ròng' })
    const pair = within(income).getAllByRole('article')
    expect(pair).toHaveLength(1)
    expect(pair[0].querySelector('header')).toHaveTextContent('BAU 3 vụ / 1Mha')
    for (const card of pair) {
      const paths = [...card.querySelectorAll('path.recharts-line-curve')]
      expect(paths).toHaveLength(8)
      expect(paths.map((path) => path.getAttribute('stroke'))).toEqual([...Array(2)].flatMap(() => ['#3478c6', '#9362bc', '#ce762b', '#589044']))
      expect(paths.slice(0, 4).map((path) => path.getAttribute('stroke-opacity'))).toEqual(Array(4).fill('0.42'))
      expect(paths.slice(4).map((path) => path.getAttribute('stroke-opacity'))).toEqual(Array(4).fill('1'))
      for (const path of paths) expect(path.getAttribute('d')).not.toMatch(/[CQ]/)
      for (const path of paths.slice(0, 4)) expect(path).toHaveAttribute('stroke-dasharray', '6 4')
      for (const path of paths.slice(4)) expect(path).not.toHaveAttribute('stroke-dasharray')
      expect(card.querySelectorAll('circle.recharts-line-dot')).toHaveLength(192)
      expect(card.querySelector('header')).toHaveTextContent('Đơn vị: VNĐ/ha')
    }
    for (const insight of screen.getAllByRole('complementary')) {
      expect(insight.querySelectorAll('p')).toHaveLength(1)
      expect(insight.querySelectorAll('strong').length).toBeGreaterThan(4)
    }
    expect(screen.getByRole('complementary', { name: 'Nhận xét · Tỷ suất lợi nhuận' })).toHaveTextContent('điểm %')
  })

  it('shows all four conditions with the selected year and units in the tooltip', async () => {
    const { container } = render(<Bau3LineChart data={data} family="bau3s" metric="income" domain={bau3Domain(data, 'income', 'USD')} language="en" />)
    const wrapper = container.querySelector<HTMLElement>('.recharts-wrapper')!
    Object.defineProperty(wrapper, 'offsetWidth', { value: 620 })
    Object.defineProperty(wrapper, 'offsetHeight', { value: 310 })
    vi.spyOn(wrapper, 'getBoundingClientRect').mockReturnValue({ x: 0, y: 0, left: 0, top: 0, width: 620, height: 310, right: 620, bottom: 310, toJSON: () => ({}) })
    const dots = container.querySelectorAll('circle.recharts-line-dot')
    const hover = (dot: Element) => fireEvent.mouseMove(dot, { clientX: Number(dot.getAttribute('cx')), clientY: Number(dot.getAttribute('cy')) })
    hover(dots[0])
    const tooltip = container.querySelector('.recharts-tooltip-wrapper')!
    await waitFor(() => expect(tooltip).toHaveTextContent('Year 2027'))
    expect(tooltip).toHaveStyle({ visibility: 'visible' })
    for (const amount of ['593.43', '627.16', '608.57', '630.13']) expect(tooltip).toHaveTextContent(`${amount} USD/ha`)
    hover(dots[23])
    await waitFor(() => expect(tooltip).toHaveTextContent('Year 2050'))
    expect(tooltip).toHaveTextContent('37.55 USD/ha')
  })

  it('connects the mobile menu and direct URL and translates units and observations', async () => {
    const navigate = vi.fn()
    const { unmount } = render(<HeaderNavigation language="vi" page="bau3Comparison" mobile onNavigate={navigate} />)
    fireEvent.click(screen.getByRole('button', { name: 'Kinh tế' }))
    fireEvent.click(screen.getByRole('button', { name: 'So sánh' }))
    const link = screen.getByRole('link', { name: 'BAU3S vs 1Mha' })
    expect(link).toHaveAttribute('href', '#economics-bau3-vs-1mha')
    expect(link).toHaveAttribute('aria-current', 'page')
    fireEvent.click(link)
    expect(navigate).toHaveBeenCalledOnce()
    unmount()
    window.history.replaceState(null, '', '#economics-bau3-vs-1mha')
    render(<App />)
    expect(await screen.findByRole('heading', { name: 'BAU 3 vụ so với 1Mha' })).toBeInTheDocument()
    expect(document.title).toBe('BAU 3 vụ so với 1Mha | STAR FARM')
    fireEvent.click(screen.getByRole('button', { name: 'English' }))
    expect(document.title).toBe('BAU 3 seasons vs 1Mha | STAR FARM')
    const income = screen.getByRole('region', { name: 'Net income' })
    for (const card of within(income).getAllByRole('article')) expect(card.querySelector('header')).toHaveTextContent('Unit: USD/ha')
    expect(screen.getByRole('complementary', { name: 'What the comparison shows · Net income' })).toHaveTextContent('prioritizing 1Mha')
  })
})
