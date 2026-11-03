import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import SeasonalComparison from '../src/features/economics/SeasonalComparison'
import SeasonalOverview from '../src/features/economics/SeasonalOverview'
import Bau3ComparisonPage from '../src/features/economics/Bau3ComparisonPage'
import Bau2ComparisonPage from '../src/features/economics/Bau2ComparisonPage'
import ResourcesPage from '../src/features/resources/ResourcesPage'
import EnvironmentPage from '../src/features/environment/EnvironmentPage'
import { aggregateSeasonalData, cultivatedPeriods, seasonalMetricGroups, seasonalTopicData, packSeasonalData, unpackSeasonalData } from '../src/features/economics/seasonalData'
import type { SeasonalConfig, PackedSeasonalData } from '../src/features/economics/seasonalData'
import { seasonalChange } from '../src/features/economics/seasonalFormatting'
import cached from '../src/data/economics-seasonal.json'
import allCached from '../src/data/all-seasonal.json'

const data = unpackSeasonalData(cached as PackedSeasonalData), all = unpackSeasonalData(allCached as PackedSeasonalData)
const config: SeasonalConfig = { topic: 'economics', kind: 'comparison', family: 'bau3s' }
function fixture(multiplier = 1) {
  const header = 'datetime,Scenario Group,Season Type,Climate Type,Resource Scenario,Net Income,Avg Yield,Production Cost,Straw Value,Profit Margin,Labor Intensity,Water Usage,Fertilizer Usage,Pesticide Usage,Methane Emissions,Emission Intensity,AWD Adoption\n'
  const row = (date: string, income: number, yieldValue: number, group = 'Business As Usual', system = '3 Seasons') => `${date},${group},${system},Mild Climate,Normal Economy,${income * multiplier},${yieldValue},${20 * multiplier},${5 * multiplier},50,100,200,50,2,300,0.05,${group === '1Mha' ? 'With AWD' : 'Without AWD'}`
  return header + [
    row('2022-03-01', 9999, 99), row('2027-03-01', 9999, 99, 'Business As Usual', '2 Seasons'),
    row('2027-02-28', 10, 4), row('2027-03-02', 30, 6), row('2027-07-15', 40, 7), row('2027-11-18', -10, 3),
    row('2027-03-01', 50, 5, '1Mha', '2 Seasons'), row('2027-02-28', 70, 7, '1Mha', '2 Seasons'), row('2027-08-15', 0, 8, '1Mha', '2 Seasons'),
    row('2048-07-31', 100, 9, '1Mha', '2 Seasons'), row('2027-11-18', 80, 7, 'Business As Usual', 'Sustainable'),
  ].join('\n')
}

describe('seasonal data for all topics and farming systems', () => {
  it('separates years, crops and all four families, computes every metric and calculates ROI from means', () => {
    const result = aggregateSeasonalData(fixture(), fixture(1000))
    expect(result.rows).toHaveLength(8)
    const early = result.rows.find((row) => row.family === 'bau3s' && row.period === 'early')!
    expect(early.USD.income).toEqual({ mean: 20 })
    expect(early.VND.income!.mean).toBe(20000)
    expect(early.VND.yield).toEqual(early.USD.yield)
    expect(early.USD.roi!.mean).toBe(100)
    expect(early.USD.water!.mean).toBe(200)
    expect(early.USD.methane!.mean).toBe(300)
    expect(early.USD.awd!.mean).toBe(0)
    expect(result.rows.find((row) => row.family === 'oneMha')!.USD.awd!.mean).toBe(100)
    expect(result.rows.find((row) => row.family === 'bau2s')!.USD.income!.mean).toBe(9999)
    expect(result.rows.find((row) => row.family === 'bauss')!.USD.income!.mean).toBe(80)
    expect(result.rows.find((row) => row.family === 'bau3s' && row.period === 'late')!.USD.income!.mean).toBe(-10)
    expect(result.rows.find((row) => row.family === 'oneMha' && row.period === 'middle' && row.year === 2027)!.USD.income!.mean).toBe(0)
    expect(result.rows.find((row) => row.year === 2048)!.period).toBe('middle')
    expect(cultivatedPeriods('oneMha')).toEqual(['early', 'middle'])
    expect(cultivatedPeriods('bau2s')).toEqual(['early', 'middle'])
    expect(cultivatedPeriods('bauss')).toHaveLength(3)
  })

  it('preserves missing measurements, rejects malformed sources and keeps per-topic payloads separate', () => {
    const blank = fixture().replace('Normal Economy,40,7', 'Normal Economy,,7')
    expect(aggregateSeasonalData(blank, blank).rows.find((row) => row.family === 'bau3s' && row.period === 'middle')!.USD.income).toBeNull()
    expect(() => aggregateSeasonalData(fixture().replace('2027-07-15', '2027-02-30'), fixture())).toThrow(/date/)
    expect(() => aggregateSeasonalData(fixture().replace('Normal Economy,40,7', 'Normal Economy,NaN,7'), fixture())).toThrow(/non-finite/)
    expect(() => aggregateSeasonalData(fixture(), fixture().replace('2027-07-15', '2027-03-15'))).toThrow(/populations|match/)
    expect(Object.keys(seasonalTopicData(all, 'resources').rows[0].USD)).toEqual(['water', 'fertilizer', 'pesticides'])
  })

  it('matches all source CSVs and generates every topic for 960 seasonal groups', () => {
    expect(aggregateSeasonalData(readFileSync('src/data/STAR_FARM CSV - Master file.csv', 'utf8'), readFileSync('src/data/STAR_FARM CSV - Dữ liệu tổng.csv', 'utf8'))).toEqual(all)
    expect(all.rows).toHaveLength(960)
    expect(seasonalTopicData(all, 'economics')).toEqual(data)
    expect(unpackSeasonalData(packSeasonalData(all, 'all'))).toEqual(all)
    for (const row of all.rows) {
      expect(cultivatedPeriods(row.family)).toContain(row.period)
      expect(Object.keys(row.USD)).toHaveLength(seasonalMetricGroups.all.length)
      expect(row.code).toBeTruthy()
      expect(row.USD.income!.mean).toBeTypeOf('number')
    }
  })

  it('uses percentage points for rates, favorable colors for lower inputs, and absolute changes from nonpositive income', () => {
    expect(seasonalChange(30, 40, 'margin', 'vi')).toEqual({ tone: 'good', text: 'tăng 10 điểm %' })
    expect(seasonalChange(30, 40, 'roi', 'en').text).toContain('10 pp')
    expect(seasonalChange(100, 80, 'water', 'en').tone).toBe('good')
    expect(seasonalChange(100, 120, 'cost', 'vi').tone).toBe('bad')
    expect(seasonalChange(-10, 30, 'income', 'en').text).toContain('40.00 USD/ha')
  })
})

describe('seasonal interface', () => {
  it.each([
    { name: 'BAU 3 comparison', page: <Bau3ComparisonPage language="vi" />, cards: 7 },
    { name: 'BAU 2 comparison', page: <Bau2ComparisonPage language="vi" />, cards: 7 },
    { name: 'resource farming', page: <ResourcesPage page="resourceOneMha" language="vi" />, cards: 3 },
    { name: 'environment comparison', page: <EnvironmentPage page="environmentBaussComparison" language="vi" />, cards: 3 },
  ])('offers a seasonal view for $name with all relevant metrics and no removed helper content', async ({ page, cards }) => {
    render(page)
    fireEvent.click(screen.getByRole('button', { name: 'Theo từng vụ' }))
    await screen.findByRole('heading', { name: 'Phân tích theo từng vụ' })
    expect(screen.getAllByRole('article')).toHaveLength(cards)
    expect(document.body).not.toHaveTextContent(/P10|P90|n =|Thời gian mùa vụ|Cách đọc số liệu thử nghiệm/)
    fireEvent.click(screen.getByRole('button', { name: 'Trung bình năm' }))
    expect(screen.queryByRole('heading', { name: 'Phân tích theo từng vụ' })).not.toBeInTheDocument()
  })

  it('updates crops and years, supports keyboard selection, and labels unplanted 1Mha crops in both languages', () => {
    const { rerender } = render(<SeasonalComparison language="vi" data={data} config={config} />)
    const income = screen.getByRole('article', { name: 'Thu nhập ròng trên hecta' })
    expect(income.querySelectorAll('.recharts-bar')).toHaveLength(2)
    const plot = within(income).getByRole('group', { name: 'Thu nhập ròng trên hecta' })
    fireEvent.keyDown(plot, { key: 'End' })
    expect(within(income).getByText('Không canh tác')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Qua nhiều năm' }))
    fireEvent.keyDown(screen.getByRole('group', { name: 'Thu nhập ròng trên hecta' }), { key: 'ArrowRight' })
    expect(screen.getByRole('region', { name: 'Số liệu đang chọn · Thu nhập ròng trên hecta' })).toHaveTextContent('Năm 2028')
    fireEvent.change(screen.getByLabelText('Mùa vụ'), { target: { value: 'late' } })
    expect(screen.getByRole('article', { name: 'Thu nhập ròng trên hecta' })).toHaveTextContent('Không canh tác')
    expect(screen.getByRole('article', { name: 'Thu nhập ròng trên hecta' }).querySelectorAll('.recharts-line-curve')).toHaveLength(1)
    rerender(<SeasonalComparison language="en" data={data} config={config} />)
    expect(screen.getByLabelText('Crop season')).toHaveValue('late')
    const translated = screen.getByRole('article', { name: 'Net income per hectare' })
    expect(translated).toHaveTextContent('Not grown')
    expect(translated).toHaveTextContent('USD/ha')
    fireEvent.click(within(translated).getByRole('button', { name: '1Mha' }))
    expect(translated.querySelectorAll('.recharts-line-curve')).toHaveLength(0)
  })

  it('renders seasonal tables and mobile cards with linked filters and an explicit unplanted third crop', () => {
    render(<SeasonalOverview language="vi" data={data} metrics={seasonalMetricGroups.economics} mode="year" year={2027} period="early" />)
    fireEvent.change(screen.getByLabelText('Nhóm kịch bản'), { target: { value: 'oneMha' } })
    expect((screen.getByLabelText('Hệ canh tác') as HTMLSelectElement).options).toHaveLength(2)
    expect(screen.getAllByRole('article')).toHaveLength(12)
    const table = screen.getByRole('table')
    expect(within(table).getAllByText('Không canh tác')).toHaveLength(4)
    expect(within(table).getAllByRole('columnheader')).toHaveLength(13)
    expect(table).not.toHaveTextContent(/P10|P90|n =|Thời gian mùa vụ/)
  })
})
