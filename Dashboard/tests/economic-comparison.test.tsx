import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import App from '../src/app/App'
import HeaderNavigation from '../src/app/HeaderNavigation'
import EconomicComparisonPage from '../src/features/economics/EconomicComparisonPage'
import ComparisonBarChart from '../src/features/economics/ComparisonBarChart'
import { aggregateEconomicComparison, selectComparisonCohort } from '../src/features/economics/comparisonData'
import type { ComparisonCohort, EconomicComparisonData } from '../src/features/economics/comparisonData'
import cached from '../src/data/economics-comparison.json'

const data = cached as EconomicComparisonData
const header = 'datetime,Scenario Group,Climate Type,Resource Scenario,Net Income,Straw Value,Production Cost,Avg Yield,Labor Intensity\n'
function fixture(multiplier = 1) {
  const row = (year: number, group: string, climate: string, resource: string, income: number, straw: number | null, cost: number, yieldValue: number, labor: number) => `${year}-02-18,${group},${climate},${resource},${income * multiplier},${straw === null ? '' : straw * multiplier},${cost * multiplier},${yieldValue},${labor}`
  return header + [
    row(2022, 'Business As Usual', 'Mild Climate', 'Normal Economy', 99999, 999, 1, 99, 999),
    row(2026, '1Mha', 'Mild Climate', 'Normal Economy', 99999, 999, 1, 99, 999),
    row(2027, '1Mha', 'Mild Climate', 'Normal Economy', 10, 2, 10, 5, 300),
    row(2050, '1Mha', 'Mild Climate', 'Normal Economy', 30, 4, 30, 7, 320),
    row(2027, '1Mha', 'Serve Climate', 'Resource Shortage', 0, null, 0, 6, 280),
    row(2027, 'Business As Usual', 'Mild Climate', 'Normal Economy', 100, 10, 100, 8, 200),
    row(2027, 'Business As Usual', 'Serve Climate', 'Resource Shortage', -20, 3, 40, 4, 190),
  ].join('\n')
}

describe('economic comparison aggregation', () => {
  it('averages records within each filter combination, preserves zero and negative values, and excludes historical data', () => {
    const result = aggregateEconomicComparison(fixture(), fixture(1000))
    expect(result.cohorts).toHaveLength(9)
    expect(result).toMatchObject({ startYear: 2027, endYear: 2050 })
    const all = selectComparisonCohort(result, 'all', 'all')!
    expect(all.groups.bau.count).toBe(2)
    expect(all.groups.oneMha.count).toBe(3)
    expect(all.groups.oneMha.USD.income).toBeCloseTo(40 / 3)
    expect(all.groups.oneMha.VND.income).toBeCloseTo(40000 / 3)
    expect(all.groups.oneMha.USD.straw).toBe(3)
    const severe = selectComparisonCohort(result, 'severe', 'shortage')!
    expect(severe.groups.oneMha.USD).toMatchObject({ income: 0, cost: 0, straw: null })
    expect(severe.groups.bau.USD.income).toBe(-20)
    const missing = selectComparisonCohort(result, 'mild', 'shortage')!
    expect(missing.groups.oneMha.count).toBe(0)
    expect(Object.values(missing.groups.oneMha.USD).every((value) => value === null)).toBe(true)
  })

  it('recognizes Vietnamese categories, retains native currencies and rejects invalid or inconsistent source data', () => {
    const vietnamese = fixture(1000).replaceAll('Business As Usual', 'Thường lệ').replaceAll('Mild Climate', 'Khí hậu ôn hòa').replaceAll('Serve Climate', 'Khí hậu khắc nghiệt').replaceAll('Normal Economy', 'Nền kinh tế bình thường').replaceAll('Resource Shortage', 'Khan hiếm tài nguyên')
    expect(aggregateEconomicComparison(fixture(), vietnamese)).toEqual(aggregateEconomicComparison(fixture(), fixture(1000)))
    expect(() => aggregateEconomicComparison('datetime\n2027-01-01', fixture())).toThrow(/columns/)
    expect(() => aggregateEconomicComparison(fixture().replace('2027-02-18', 'invalid'), fixture())).toThrow(/date/)
    expect(() => aggregateEconomicComparison(fixture().replace(',10,2,10,', ',NaN,2,10,'), fixture())).toThrow(/non-finite/)
    expect(() => aggregateEconomicComparison(fixture().replaceAll('Serve Climate', 'Unknown'), fixture())).toThrow(/unknown category/)
    expect(() => aggregateEconomicComparison(fixture(), fixture().replace('2027-02-18,1Mha,Serve Climate', '2022-02-18,1Mha,Serve Climate'))).toThrow(/do not match/)
  })

  it('matches the cached CSV aggregation and independently verified reference values', () => {
    const master = readFileSync(resolve('src/data/STAR_FARM CSV - Master file.csv'), 'utf8')
    const combined = readFileSync(resolve('src/data/STAR_FARM CSV - Dữ liệu tổng.csv'), 'utf8')
    expect(aggregateEconomicComparison(master, combined)).toEqual(data)
    const all = selectComparisonCohort(data, 'all', 'all')!
    expect(all.groups.bau.count + all.groups.oneMha.count).toBe(18984)
    expect(all.groups.bau.USD.income).toBeCloseTo(524.83346671, 6)
    expect(all.groups.oneMha.USD.income).toBeCloseTo(986.30069836, 6)
    expect(all.groups.bau.USD.labor).toBeCloseTo(275.54498168, 6)
    expect(all.groups.oneMha.USD.labor).toBeCloseTo(283.92599074, 6)
    expect(all.groups.bau.USD.cost).toBeCloseTo(980.49743803, 6)
    expect(all.groups.oneMha.USD.straw).toBeCloseTo(43.06871717, 6)
    expect(all.groups.bau.VND.income).toBeCloseTo(13814628.7168, 3)
  })
})

describe('economic comparison interface', () => {
  it('shows five bar charts with fixed scenario colors, full values, correct units and axes starting at zero', () => {
    render(<EconomicComparisonPage language="en" />)
    expect(screen.getByRole('heading', { name: 'Economic comparison' })).toBeInTheDocument()
    const cards = screen.getAllByRole('article')
    expect(cards).toHaveLength(5)
    for (const card of cards) {
      const bars = [...card.querySelectorAll('path.recharts-rectangle')]
      expect(bars.map((path) => path.getAttribute('fill'))).toEqual(['#bf554c', '#2f8050'])
      const zero = Number(card.querySelector('.recharts-reference-line-line')!.getAttribute('y1'))
      for (const bar of bars) expect(Number(bar.getAttribute('y')) + Number(bar.getAttribute('height'))).toBeCloseTo(zero, 4)
    }
    const income = screen.getByRole('article', { name: 'Average net income' })
    expect(income.querySelector('.comparison-values')).toHaveTextContent('524.83 $/ha')
    expect(income.querySelector('.comparison-values')).toHaveTextContent('986.30 $/ha')
    expect(income.querySelector('header')).toHaveTextContent('Unit: $/ha')
    const straw = screen.getByRole('article', { name: 'Average straw value' })
    expect(straw.querySelector('header')).toHaveTextContent('Unit: $/ha')
    expect(screen.getByRole('article', { name: 'Average labor intensity' }).querySelector('header')).toHaveTextContent('Unit: hours/ha')
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  it('combines filters across every chart, preserves selections and currencies when translating, and resets', () => {
    const { rerender } = render(<EconomicComparisonPage language="vi" />)
    fireEvent.click(within(screen.getByRole('group', { name: 'Thời tiết' })).getByRole('button', { name: 'Khắc nghiệt' }))
    fireEvent.click(within(screen.getByRole('group', { name: 'Tài nguyên' })).getByRole('button', { name: 'Thiếu tài nguyên' }))
    expect(screen.getByRole('status')).toHaveTextContent('Thời tiết: Khắc nghiệt. Tài nguyên: Thiếu tài nguyên.')
    expect(screen.getByRole('article', { name: 'Thu nhập ròng trung bình' }).querySelector('.comparison-values')).toHaveTextContent('21.458.536 VNĐ/ha')
    const filtered = selectComparisonCohort(data, 'severe', 'shortage')!
    for (const [index, metric] of (['income', 'straw', 'cost', 'yield', 'labor'] as const).entries()) {
      const card = screen.getAllByRole('article')[index]
      const digits = index < 3 ? 0 : 2
      const number = new Intl.NumberFormat('vi', { minimumFractionDigits: digits, maximumFractionDigits: digits })
      expect(card.querySelector('.comparison-values')).toHaveTextContent(number.format(filtered.groups.oneMha.VND[metric]!))
    }
    rerender(<EconomicComparisonPage language="en" />)
    expect(screen.getByRole('button', { name: 'Severe weather' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Resource shortage' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('article', { name: 'Average net income' }).querySelector('.comparison-values')).toHaveTextContent('815.23 $/ha')
    fireEvent.click(screen.getByRole('button', { name: /Clear filters/ }))
    expect(screen.getByRole('button', { name: 'All weather' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'All resources' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('article', { name: 'Average net income' }).querySelector('.comparison-values')).toHaveTextContent('986.30 $/ha')
  })

  it('shows the scenario value and unit on hover', async () => {
    const { container } = render(<ComparisonBarChart metric="labor" cohort={selectComparisonCohort(data, 'all', 'all')!} language="en" startYear={2027} endYear={2050} />)
    const wrapper = container.querySelector<HTMLElement>('.recharts-wrapper')!
    Object.defineProperty(wrapper, 'offsetWidth', { value: 600 })
    Object.defineProperty(wrapper, 'offsetHeight', { value: 280 })
    vi.spyOn(wrapper, 'getBoundingClientRect').mockReturnValue({ x: 0, y: 0, left: 0, top: 0, width: 600, height: 280, right: 600, bottom: 280, toJSON: () => ({}) })
    const bars = container.querySelectorAll('path.recharts-rectangle')
    expect(bars).toHaveLength(2)
    const bar = bars[1]
    fireEvent.mouseMove(bar, { clientX: Number(bar.getAttribute('x')) + Number(bar.getAttribute('width')) / 2, clientY: Number(bar.getAttribute('y')) + 10 })
    const tooltip = container.querySelector('.recharts-tooltip-wrapper')!
    await waitFor(() => expect(tooltip).toHaveStyle({ visibility: 'visible' }))
    expect(tooltip).toHaveTextContent('1Mha')
    expect(tooltip).toHaveTextContent('283.93 hours/ha')
  })

  it('keeps missing groups empty instead of rendering fabricated zero values', () => {
    const empty: ComparisonCohort = { climate: 'all', resource: 'all', groups: { bau: { count: 0, USD: { income: null, straw: null, cost: null, yield: null, labor: null }, VND: { income: null, straw: null, cost: null, yield: null, labor: null } }, oneMha: { count: 0, USD: { income: null, straw: null, cost: null, yield: null, labor: null }, VND: { income: null, straw: null, cost: null, yield: null, labor: null } } } }
    render(<ComparisonBarChart metric="income" cohort={empty} language="vi" startYear={2027} endYear={2050} />)
    expect(screen.getByText('Không có dữ liệu cho lựa chọn này.')).toBeInTheDocument()
    expect(screen.getAllByText('Chưa có dữ liệu')).toHaveLength(2)
  })

  it('connects the comparison menu on mobile, closes on navigation and supports direct URLs', async () => {
    const navigate = vi.fn()
    const { unmount } = render(<HeaderNavigation language="vi" page="economicComparison" mobile onNavigate={navigate} />)
    fireEvent.click(screen.getByRole('button', { name: 'Kinh tế' }))
    fireEvent.click(screen.getByRole('button', { name: 'Tổng quan' }))
    const link = screen.getByRole('link', { name: 'Bảng so sánh' })
    expect(link).toHaveAttribute('href', '#economics-comparison')
    expect(link).toHaveAttribute('aria-current', 'page')
    fireEvent.click(link)
    expect(navigate).toHaveBeenCalledOnce()
    expect(screen.getByRole('button', { name: 'Kinh tế' })).toHaveAttribute('aria-expanded', 'false')
    unmount()
    window.history.replaceState(null, '', '#economics-comparison')
    render(<App />)
    expect(await screen.findByRole('heading', { name: 'So sánh kinh tế' })).toBeInTheDocument()
    expect(document.title).toBe('So sánh kinh tế | STAR FARM')
    fireEvent.click(screen.getByRole('button', { name: 'English' }))
    expect(document.title).toBe('Economic comparison | STAR FARM')
  })
})
