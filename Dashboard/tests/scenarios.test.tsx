import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import App from '../src/app/App'
import ScenarioDetailsPage from '../src/features/scenarios/ScenarioDetailsPage'
import { aggregateScenarioData } from '../src/features/scenarios/aggregateScenarios'
import { relativeChange, scenarioSummary } from '../src/features/scenarios/scenarioAnalysis'
import data from '../src/data/scenario-details.json'

const header = 'datetime,Scenario Code,Scenario Name,AWD Adoption,Net Income,Straw Value,Production Cost,Labor Intensity,Avg Yield,Profit Margin,Water Usage,Fertilizer Usage,Pesticide Usage,Methane Emissions,Emission Intensity\n'
function fixture(multiplier = 1) {
  const row = (year: number, code: string, income: number, cost: number, awd: string) => `${year}-02-18,${code},${code},${awd},${income * multiplier},${2 * multiplier},${cost * multiplier},100,5,50,200,50,2,300,0.06`
  return header + [
    row(2016, 'BAU-3V-OH-TT', 10, 10, 'Without AWD'),
    row(2022, 'BAU-3V-OH-TT', 20, 20, 'Without AWD'),
    row(2023, 'BAU-3V-OH-TT', 9999, 1, 'Without AWD'),
    row(2027, 'BAU-BV-OH-TH', 10, 10, 'With AWD'),
    row(2050, 'BAU-BV-OH-TH', 30, 60, 'With AWD'),
    row(2050, '1M-2V-OH-BT', 0, 0, 'With AWD'),
  ].join('\n')
}

describe('scenario calculations', () => {
  it('uses the historical period and future records separately, and averages ROI per record', () => {
    const result = aggregateScenarioData(fixture(), fixture(1000))
    expect(result.baselinePeriod).toEqual({ start: 2016, end: 2022 })
    expect(result.period).toEqual({ start: 2027, end: 2050 })
    expect(result.baseline.USD.count).toBe(2)
    expect(result.baseline.USD.values.income).toBe(15)
    expect(result.baseline.VND.values.income).toBe(15000)
    const scenario = result.scenarios.find(({ code }) => code === 'BAU-BV-OH-TH')!
    expect(scenario.USD.count).toBe(2)
    expect(scenario.USD.values.income).toBe(20)
    expect(scenario.VND.values.income).toBe(20000)
    expect(scenario.USD.values.cost).toBe(35)
    expect(scenario.USD.values.roi).toBe(75)
    expect(scenario.VND.values.roi).toBe(75)
    expect(scenario.USD.withAwd).toBe(2)
    const oneMha = result.scenarios.find(({ family }) => family === 'oneMha')!
    expect(oneMha.USD.values.income).toBe(0)
    expect(oneMha.USD.values.cost).toBe(0)
    expect(oneMha.USD.values.roi).toBeNull()
  })

  it('rejects invalid source data and safely handles missing metrics and zero baselines', () => {
    expect(() => aggregateScenarioData('datetime\n2027-01-01', fixture())).toThrow(/columns/)
    expect(() => aggregateScenarioData(fixture().replace(',100,5,', ',NaN,5,'), fixture())).toThrow(/non-finite/)
    expect(() => aggregateScenarioData(fixture().replaceAll('With AWD', 'Unknown AWD'), fixture())).toThrow(/AWD/)
    const blank = aggregateScenarioData(fixture().replaceAll(',100,5,', ',,5,'), fixture())
    expect(blank.scenarios[0].USD.values.labor).toBeNull()
    expect(relativeChange(10, 0)).toBeNull()
    expect(relativeChange(null, 10)).toBeNull()
    expect(relativeChange(-5, -10)).toBe(50)
    expect(relativeChange(5, 10)).toBe(-50)
  })

  it('matches the CSVs and the independently verified numbers in the reference dashboard', () => {
    const master = readFileSync(resolve('src/data/STAR_FARM CSV - Master file.csv'), 'utf8')
    const combined = readFileSync(resolve('src/data/STAR_FARM CSV - Dữ liệu tổng.csv'), 'utf8')
    expect(aggregateScenarioData(master, combined)).toEqual(data)
    expect(data.scenarios).toHaveLength(16)
    expect(data.baseline.VND.count).toBe(420)
    const selected = data.scenarios.find(({ code }) => code === 'BAU-BV-OH-TH')!
    expect(selected.VND.count).toBe(1440)
    expect(selected.VND.values.income).toBeCloseTo(12453121.065104742, 4)
    expect(selected.VND.values.cost).toBeCloseTo(28690711.558819454, 4)
    expect(selected.VND.values.roi).toBeCloseTo(49.4133094255454, 7)
    expect(selected.VND.values.water).toBeCloseTo(326.21164195763873, 7)
    expect(selected.VND.values.methane).toBeCloseTo(395.40884277486094, 7)
    expect(relativeChange(selected.VND.values.income, data.baseline.VND.values.income)).toBeCloseTo(-14.067423946, 5)
  })

  it('reports the income and emissions trade-off and changes its conclusion with the data', () => {
    const selected = data.scenarios.find(({ code }) => code === 'BAU-BV-OH-TH')!
    expect(scenarioSummary(selected.VND.values, data.baseline.VND.values, 'vi')).toContain('lợi ích giảm phát thải đi kèm đánh đổi về thu nhập')
    const improved = { ...data.baseline.USD.values, income: data.baseline.USD.values.income * 2, methane: data.baseline.USD.values.methane / 2 }
    expect(scenarioSummary(improved, data.baseline.USD.values, 'en')).toContain('higher income alongside lower emissions')
  })
})

describe('scenario details page', () => {
  it('shows the selector, all three sections and values matching the reference', () => {
    render(<ScenarioDetailsPage language="vi" />)
    expect(screen.getByLabelText('Chọn kịch bản bạn muốn xem trước:')).toHaveValue('BAU-BV-OH-TH')
    expect(screen.getAllByRole('option')).toHaveLength(16)
    expect(screen.getByRole('heading', { name: '1. Tính khả thi về kinh tế' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '2. Quản lý nguồn lực' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '3. Tính bền vững' })).toBeInTheDocument()
    for (const value of ['12.453.121', '1.245.575', '28.690.712', '293,18', '6,63', '29,94', '49,41', '326,21', '112,89', '5,49', '395,41', '0,06']) expect(screen.getByText(value)).toBeInTheDocument()
    expect(screen.getAllByText('VNĐ/ha')).toHaveLength(3)
    expect(screen.getByText('kg CH₄/kg gạo')).toBeInTheDocument()
    expect(screen.getByText('Sử dụng AWD')).toBeInTheDocument()
    expect(screen.getByLabelText('Nhận xét tổng quan')).toHaveTextContent('giảm 14,1%')
    const cost = screen.getByText('Chi phí sản xuất').parentElement!
    expect(cost.querySelector('.scenario-change.bad')).toHaveTextContent('25,9%')
    const water = screen.getByText('Sử dụng nước').parentElement!
    expect(water.querySelector('.scenario-change.good')).toHaveTextContent('38,8%')
  })

  it('updates every metric and the summary when selecting a scenario, and preserves selection on translation', () => {
    const { rerender } = render(<ScenarioDetailsPage language="vi" />)
    const originalSummary = screen.getByLabelText('Nhận xét tổng quan').textContent
    fireEvent.change(screen.getByLabelText('Chọn kịch bản bạn muốn xem trước:'), { target: { value: 'BAU-2V-OH-BT' } })
    expect(screen.getByText('Không sử dụng AWD')).toBeInTheDocument()
    expect(screen.getByLabelText('Nhận xét tổng quan').textContent).not.toBe(originalSummary)
    expect(screen.queryByText('12.453.121')).not.toBeInTheDocument()
    rerender(<ScenarioDetailsPage language="en" />)
    expect(screen.getByLabelText('Choose the scenario you want to explore:')).toHaveValue('BAU-2V-OH-BT')
    expect(screen.getAllByText('$/ha')).toHaveLength(3)
    expect(screen.queryByText('VNĐ/ha')).not.toBeInTheDocument()
    expect(screen.getByText('Without AWD')).toBeInTheDocument()
    expect(screen.getByLabelText('Scenario overview')).toHaveTextContent('2016–2022 baseline')
  })

  it('opens the new header link, supports deep links and updates page metadata in both languages', async () => {
    window.history.replaceState(null, '', '#scenario-details')
    render(<App />)
    expect(await screen.findByRole('heading', { name: 'Về các chỉ số kịch bản đến năm 2050' })).toBeInTheDocument()
    expect(document.title).toBe('Chi tiết kịch bản | STAR FARM')
    const menu = screen.getByRole('navigation', { name: 'Menu chính' })
    expect(within(menu).getByRole('link', { name: 'Chi tiết kịch bản' })).toHaveAttribute('aria-current', 'page')
    fireEvent.click(screen.getByRole('button', { name: 'English' }))
    expect(screen.getByRole('heading', { name: 'Scenario indicators through 2050' })).toBeInTheDocument()
    expect(document.title).toBe('Scenario details | STAR FARM')
    fireEvent.click(within(menu).getByRole('link', { name: 'Home' }))
    expect(await screen.findByRole('heading', { name: /The impact of the/ })).toBeInTheDocument()
  })
})
