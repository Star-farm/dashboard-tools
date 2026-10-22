import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import App from '../src/app/App'
import HeaderNavigation from '../src/app/HeaderNavigation'
import EconomicOverviewPage from '../src/features/economics/EconomicOverviewPage'
import { aggregateEconomicOverview, emptyEconomicFilters, filterEconomicRows } from '../src/features/economics/economicsData'
import type { EconomicRow } from '../src/features/economics/economicsData'
import data from '../src/data/economics-overview.json'

const rows = data as EconomicRow[]
const header = 'datetime,Scenario Code,Scenario Name,AWD Adoption,Scenario Group,Season Type,Climate Type,Resource Scenario,Net Income,Production Cost,Straw Value,Profit Margin,Avg Yield,Labor Intensity\n'
function fixture(multiplier = 1) {
  const row = (year: number, income: number, cost: number, code = 'future') => `${year}-02-18,${code},${code},With AWD,1Mha,2 Seasons,Mild Climate,Normal Economy,${income * multiplier},${cost * multiplier},${2 * multiplier},50,5,100`
  return header + [row(2016, 5, 20, 'baseline'), row(2022, 15, 20, 'baseline'), row(2023, 99999, 1), row(2027, 10, 10), row(2050, 30, 60), row(2050, 0, 0, 'zero')].join('\n')
}

describe('economic overview data', () => {
  it('matches both source CSVs, reference values and the separately identified historical row', () => {
    const master = readFileSync(resolve('src/data/STAR_FARM CSV - Master file.csv'), 'utf8')
    const combined = readFileSync(resolve('src/data/STAR_FARM CSV - Dữ liệu tổng.csv'), 'utf8')
    expect(aggregateEconomicOverview(master, combined)).toEqual(rows)
    expect(rows).toHaveLength(17)
    const historical = rows.filter((row) => row.historical)
    expect(historical).toHaveLength(1)
    expect(historical[0]).toMatchObject({ code: 'BAU-3V-OH-TT', startYear: 2016, endYear: 2022, count: 420 })
    expect(historical[0].USD.income).toBeCloseTo(550.5559928)
    expect(rows.filter((row) => !row.historical).every((row) => row.startYear === 2027 && row.endYear === 2050)).toBe(true)
    const first = rows[0]
    expect(first.USD.income).toBeCloseTo(670.67, 2)
    expect(first.USD.cost).toBeCloseTo(886.70, 2)
    expect(first.USD.roi).toBeCloseTo(75.64, 2)
    const shortage = rows.find((row) => row.code === 'BAU-BV-OH-TH')!
    expect(shortage.USD.roi).toBeCloseTo(43.40, 2)
    expect(shortage.VND.income).toBeCloseTo(12453121.0651, 3)
  })

  it('uses a ratio of means for overview ROI, excludes intervening years and preserves zero and missing values', () => {
    const result = aggregateEconomicOverview(fixture(), fixture(1000))
    const future = result.find((row) => row.code === 'future')!
    expect(future.USD).toMatchObject({ income: 20, cost: 35, straw: 2 })
    expect(future.VND).toMatchObject({ income: 20000, cost: 35000, straw: 2000 })
    expect(future.USD.roi).toBeCloseTo(20 / 35 * 100)
    expect(result.find((row) => row.code === 'baseline')!.USD.income).toBe(10)
    expect(result.find((row) => row.code === 'zero')!.USD).toMatchObject({ income: 0, cost: 0, roi: null })
    const blank = aggregateEconomicOverview(fixture().replaceAll(',50,5,100', ',50,5,'), fixture())
    expect(blank.every((row) => row.USD.labor === null)).toBe(true)
    expect(() => aggregateEconomicOverview(fixture().replaceAll(',50,5,100', ',50,5,NaN'), fixture())).toThrow(/non-finite/)
    expect(() => aggregateEconomicOverview(fixture().replaceAll('With AWD', 'Unknown'), fixture())).toThrow(/AWD/)
    expect(() => aggregateEconomicOverview(fixture(), fixture().replace('2050-02-18,future', '2049-02-18,future'))).toThrow(/do not match/)
  })

  it('combines all five filters and returns no rows for impossible combinations', () => {
    expect(filterEconomicRows(rows, emptyEconomicFilters)).toHaveLength(17)
    const filtered = filterEconomicRows(rows, { group: 'oneMha', season: 'twoSeasons', climate: 'mild', resource: 'normal', awd: 'with' })
    expect(filtered).toHaveLength(1)
    expect(filtered[0].code).toBe('1M-2V-OH-BT')
    expect(filterEconomicRows(rows, { ...emptyEconomicFilters, group: 'oneMha', awd: 'without' })).toEqual([])
  })
})

describe('economic overview interface', () => {
  it('shows 5 filters, 12 columns, all scenarios and units, with full mobile cards', () => {
    render(<EconomicOverviewPage language="vi" />)
    expect(screen.getByRole('heading', { name: 'Tổng quan kinh tế' })).toBeInTheDocument()
    expect(screen.getAllByRole('combobox')).toHaveLength(5)
    const table = screen.getByRole('table') as HTMLTableElement
    expect(within(table).getAllByRole('columnheader')).toHaveLength(15)
    expect(within(table).getAllByRole('row')).toHaveLength(19)
    expect(within(table).getAllByText('Đơn vị: VNĐ/ha')).toHaveLength(3)
    expect(within(table).getByText('Hiện trạng · 2016–2022').closest('tr')).toBe(table.tBodies[0].rows[0])
    const mobile = screen.getByRole('region', { name: 'Các kịch bản kinh tế' })
    const cards = within(mobile).getAllByRole('article')
    expect(cards).toHaveLength(17)
    expect(within(cards[0]).getByText('Hiện trạng · 2016–2022')).toBeInTheDocument()
    expect(within(cards[1]).getByRole('heading', { name: 'Thường lệ Bền vững' })).toBeInTheDocument()
    expect(within(cards[0]).getAllByRole('term')).toHaveLength(10)
    expect(within(cards[1]).getByText('17.653.309')).toBeInTheDocument()
  })

  it('filters both views, keeps selections when translating and reads native USD amounts', () => {
    const { rerender } = render(<EconomicOverviewPage language="vi" />)
    fireEvent.change(screen.getByLabelText('Nhóm kịch bản'), { target: { value: 'bau' } })
    fireEvent.change(screen.getByLabelText('Mùa vụ'), { target: { value: 'sustainable' } })
    fireEvent.change(screen.getByLabelText('Thời tiết'), { target: { value: 'mild' } })
    fireEvent.change(screen.getByLabelText('Tài nguyên'), { target: { value: 'shortage' } })
    expect(within(screen.getByRole('table')).getAllByRole('row')).toHaveLength(3)
    expect(within(screen.getByRole('table')).getByText('12.453.121')).toBeInTheDocument()
    rerender(<EconomicOverviewPage language="en" />)
    expect(screen.getByLabelText('Resource scenario')).toHaveValue('shortage')
    const table = screen.getByRole('table')
    expect(within(table).getByText('473.11')).toBeInTheDocument()
    expect(within(table).getByText('1,089.99')).toBeInTheDocument()
    expect(within(table).getByText('43.40%')).toBeInTheDocument()
    expect(within(table).getAllByText('Unit: $/ha')).toHaveLength(3)
    fireEvent.click(screen.getByRole('button', { name: /Clear filters/ }))
    expect(within(table).getAllByRole('row')).toHaveLength(19)
    expect(screen.getAllByRole('combobox').every((select) => (select as HTMLSelectElement).value === 'all')).toBe(true)
  })

  it('provides an empty state and lets users recover', () => {
    render(<EconomicOverviewPage language="vi" />)
    fireEvent.change(screen.getByLabelText('Nhóm kịch bản'), { target: { value: 'oneMha' } })
    fireEvent.change(screen.getByLabelText('Áp dụng AWD'), { target: { value: 'without' } })
    expect(screen.getByRole('heading', { name: 'Không có kịch bản phù hợp' })).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Xóa bộ lọc' }))
    expect(screen.getByRole('table')).toBeInTheDocument()
  })

  it('connects the economics overview menu on mobile and closes it on navigation', () => {
    const navigate = vi.fn()
    render(<HeaderNavigation language="vi" page="economics" mobile onNavigate={navigate} />)
    fireEvent.click(screen.getByRole('button', { name: 'Kinh tế' }))
    fireEvent.click(screen.getByRole('button', { name: 'Tổng quan' }))
    const link = screen.getByRole('link', { name: 'Bảng thông tin' })
    expect(link).toHaveAttribute('href', '#economics-overview')
    expect(link).toHaveAttribute('aria-current', 'page')
    fireEvent.click(link)
    expect(navigate).toHaveBeenCalledOnce()
    expect(screen.getByRole('button', { name: 'Kinh tế' })).toHaveAttribute('aria-expanded', 'false')
  })

  it('loads by direct URL and updates the page title on language change', async () => {
    window.history.replaceState(null, '', '#economics-overview')
    render(<App />)
    expect(await screen.findByRole('heading', { name: 'Tổng quan kinh tế' })).toBeInTheDocument()
    expect(document.title).toBe('Tổng quan kinh tế | STAR FARM')
    fireEvent.change(screen.getByLabelText('Nhóm kịch bản'), { target: { value: 'oneMha' } })
    fireEvent.click(screen.getByRole('button', { name: 'English' }))
    await waitFor(() => expect(document.title).toBe('Economic viability overview | STAR FARM'))
    expect(screen.getByLabelText('Scenario group')).toHaveValue('oneMha')
  })
})
