import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import SeasonalComparison from '../src/features/economics/SeasonalComparison'
import SeasonalOverview from '../src/features/economics/SeasonalOverview'
import SeasonalPieChart from '../src/features/economics/SeasonalPieChart'
import Bau3ComparisonPage from '../src/features/economics/Bau3ComparisonPage'
import Bau2ComparisonPage from '../src/features/economics/Bau2ComparisonPage'
import ResourcesPage from '../src/features/resources/ResourcesPage'
import EnvironmentPage from '../src/features/environment/EnvironmentPage'
import { aggregateSeasonalData, cropPeriods, cultivatedPeriods, seasonalMetricGroups, seasonalTopicData, packSeasonalData, unpackSeasonalData } from '../src/features/economics/seasonalData'
import type { SeasonalConfig, PackedSeasonalData } from '../src/features/economics/seasonalData'
import { seasonalChange } from '../src/features/economics/seasonalFormatting'
import { averageSeasonalYears } from '../src/features/economics/seasonalYearAverage'
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

  it('matches all source CSVs and includes the combined business-as-usual baseline', () => {
    const master = readFileSync('src/data/STAR_FARM CSV - Master file.csv', 'utf8')
    const combined = readFileSync('src/data/STAR_FARM CSV - Dữ liệu tổng.csv', 'utf8')
    const detailed = aggregateSeasonalData(master, combined)
    const overall = aggregateSeasonalData(master, combined, true)
    const merged = { ...detailed, rows: [...detailed.rows, ...overall.rows.filter((row) => row.family === 'bau')] }
    expect(merged).toEqual(all)
    expect(all.rows).toHaveLength(1248)
    expect(overall.rows.filter((row) => row.family === 'bau')).toHaveLength(288)
    expect(all.rows.filter((row) => row.family === 'bau')).toHaveLength(288)
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
    ['vi', ['BAU 3 vụ', '1Mha'], 'Trong đó:'],
    ['en', ['BAU 3 seasons', '1Mha'], 'Breakdown:'],
  ] as const)('labels each seasonal insight breakdown by model in %s', (language, labels, repeatedHeading) => {
    render(<SeasonalComparison language={language} data={data} config={{ ...config, metrics: ['roi', 'margin', 'income'] }} />)
    for (const article of screen.getAllByRole('article')) {
      const details = [...article.querySelectorAll('.seasonal-crop-detail')]
      expect(details).toHaveLength(2)
      expect(details.map((detail) => detail.querySelector('h5')?.textContent)).toEqual(labels)
      expect(article).not.toHaveTextContent(repeatedHeading)
    }
  })

  it('shows model color legends for single-family rate and trend charts', async () => {
    render(<SeasonalComparison language="en" data={data} config={{ topic: 'economics', kind: 'family', family: 'oneMha', metrics: ['roi', 'income'] }} />)

    const annualLegend = screen.getByRole('group', { name: 'Legend:' })
    expect(annualLegend).toHaveTextContent('1Mha')
    const annualPlot = document.querySelector('.seasonal-plot')!
    expect(Boolean(annualPlot.compareDocumentPosition(annualLegend) & Node.DOCUMENT_POSITION_FOLLOWING)).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: 'Across years' }))
    await waitFor(() => expect(screen.getAllByRole('group', { name: 'Legend:' })).toHaveLength(2))
    for (const legend of screen.getAllByRole('group', { name: 'Legend:' })) expect(legend).toHaveTextContent('1Mha')
  })

  it('omits seasons that are not grown from a single-model composition legend', () => {
    render(<SeasonalPieChart language="en" name="1Mha" color="#267e91" unit="%" format={String} selected="early" slices={[
      { period: 'early', label: 'Winter–Spring', value: 64.5 },
      { period: 'middle', label: 'Spring–Summer', value: 35.5 },
      { period: 'late', label: 'Fall–Winter', value: null, notGrown: true, status: 'Not grown' },
    ]} allowedPeriods={['early', 'middle']} />)

    const legend = screen.getByRole('group', { name: 'Season legend' })
    expect(legend).toHaveTextContent('Winter–Spring')
    expect(legend).toHaveTextContent('Spring–Summer')
    expect(legend).not.toHaveTextContent('Fall–Winter')
  })

  it('localizes the shared crop legend immediately when the language changes', () => {
    const { rerender } = render(<SeasonalComparison language="vi" data={data} config={config} />)
    const modelLegendVi = screen.getAllByRole('group', { name: 'Chú giải:' })[0]
    expect(modelLegendVi).toHaveTextContent('BAU 3 vụ')
    expect(modelLegendVi).toHaveTextContent('1Mha')
    expect(screen.queryByRole('button', { name: 'Cả hai mô hình' })).not.toBeInTheDocument()
    const vietnameseLegend = screen.getAllByRole('group', { name: 'Chú giải màu sắc mùa vụ' })[0]
    expect(vietnameseLegend).toHaveTextContent('Đông-Xuân')
    expect(vietnameseLegend).toHaveTextContent('Xuân-Hè')
    expect(vietnameseLegend).toHaveTextContent('Thu-Đông')
    expect(vietnameseLegend).not.toHaveTextContent('early')

    rerender(<SeasonalComparison language="en" data={data} config={config} />)
    const modelLegendEn = screen.getAllByRole('group', { name: 'Legend:' })[0]
    expect(modelLegendEn).toHaveTextContent('BAU 3 seasons')
    expect(modelLegendEn).toHaveTextContent('1Mha')
    expect(screen.queryByRole('button', { name: 'Both models' })).not.toBeInTheDocument()
    const englishLegend = screen.getAllByRole('group', { name: 'Season color legend' })[0]
    expect(englishLegend).toHaveTextContent('Winter–Spring')
    expect(englishLegend).toHaveTextContent('Spring–Summer')
    expect(englishLegend).toHaveTextContent('Fall–Winter')
    expect(englishLegend).not.toHaveTextContent('early')
  })

  it('toggles the touch tooltip and supports keyboard selection without a crop selector list', () => {
    let selected = ''
    const { container } = render(<SeasonalPieChart language="en" name="BAU" color="#b8322b" unit="kg" format={String} selected="early" onSelect={(period) => { selected = period }} slices={[
      { period: 'early', label: 'Winter–Spring', value: 10 }, { period: 'middle', label: 'Spring–Summer', value: 30 }, { period: 'late', label: 'Fall–Winter', value: 10 },
    ]} />)
    expect(screen.queryByText('Choose crop season')).not.toBeInTheDocument()
    fireEvent.click(container.querySelector('[data-pie-period="middle"]')!)
    expect(screen.getByRole('status')).toHaveTextContent('30.00 kg')
    expect(selected).toBe('middle')
    fireEvent.click(container.querySelector('[data-pie-period="middle"]')!)
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    fireEvent.keyDown(screen.getByRole('group', { name: /BAU: Winter–Spring/ }), { key: 'ArrowRight' })
    expect(screen.getByRole('status')).toHaveTextContent('Spring–Summer')
    expect(selected).toBe('middle')
  })

  it('keeps negative and zero crop values intact instead of drawing misleading positive slices', async () => {
    let selected = ''
    const { container } = render(<SeasonalPieChart language="en" name="BAU" color="#b8322b" unit="USD/ha" format={String} selected="early" onSelect={(period) => { selected = period }} slices={[
      { period: 'early', label: 'Winter–Spring', value: -10 },
      { period: 'middle', label: 'Summer–Fall', value: 0 },
      { period: 'late', label: 'Fall–Winter', value: null, status: 'Not grown' },
    ]} />)
    expect(screen.getByText(/Negative values cannot be shown as shares/)).toHaveTextContent('Winter–Spring: -10 USD/ha')
    fireEvent.keyDown(screen.getByRole('group', { name: /BAU: Winter–Spring/ }), { key: 'ArrowRight' })
    expect(selected).toBe('middle')
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    await waitFor(() => expect(container.querySelector('.recharts-sector')).toHaveAttribute('fill', '#dce3d9'))
  })

  it('defaults to all-year crop means and updates when choosing an individual year', () => {
    const sample = aggregateSeasonalData(fixture(), fixture(1000))
    const means = averageSeasonalYears(sample.rows)
    expect(means.find((row) => row.family === 'oneMha' && row.period === 'middle')!.USD.income!.mean).toBe(50)
    expect(means.find((row) => row.family === 'oneMha' && row.period === 'middle')!.VND.income!.mean).toBe(50000)
    expect(means.find((row) => row.family === 'bau3s' && row.period === 'late')!.USD.income!.mean).toBe(-10)
    expect(means.some((row) => row.family === 'oneMha' && row.period === 'late')).toBe(false)
    render(<SeasonalComparison language="en" data={sample} config={{ topic: 'economics', kind: 'family', family: 'oneMha', metrics: ['income'] }} />)
    expect(screen.queryByLabelText('Year')).not.toBeInTheDocument()
    const plot = screen.getByRole('group', { name: /Composition net income per hectare by crop season during 2027-2050/ })
    expect(screen.getByRole('group', { name: /1Mha:.*Spring.*50[.]00/ })).toBeInTheDocument()
    expect(plot).toHaveAttribute('tabindex', '0')
  })

  it('shows one averaged row per crop in the all-years information table', () => {
    const sample = aggregateSeasonalData(fixture(), fixture(1000))
    render(<SeasonalOverview language="en" data={sample} metrics={['income']} mode="year" year="all" period="early" />)
    fireEvent.change(screen.getByLabelText('Scenario group'), { target: { value: 'oneMha' } })
    const table = screen.getByRole('table')
    expect(table.querySelectorAll('tbody th[scope="row"]')).toHaveLength(cropPeriods.length)
    expect(within(table).getByRole('row', { name: /Spring–Summer/ })).toHaveTextContent('50.00')
    expect(within(table).getByRole('row', { name: /Fall–Winter/ })).toHaveTextContent('Not grown')
    expect(table).toHaveTextContent('All years')
  })

  it('changes weather and resources independently in seasonal analysis', () => {
    render(<SeasonalComparison language="en" data={data} config={{ ...config, metrics: ['income'] }} />)
    fireEvent.change(screen.getByLabelText('Weather'), { target: { value: 'severe' } })
    expect(screen.getByLabelText('Resource scenario')).toHaveValue('Normal')
    fireEvent.change(screen.getByLabelText('Resource scenario'), { target: { value: 'Shortage' } })
    expect(screen.getByLabelText('Weather')).toHaveValue('severe')
    expect(screen.getByLabelText('Resource scenario')).toHaveValue('Shortage')
    expect(screen.queryByText(/Only crops grown in both systems/)).not.toBeInTheDocument()
  })


  it.each([
    { name: 'BAU 3 comparison', page: <Bau3ComparisonPage language="vi" />, cards: 7 },
    { name: 'BAU 2 comparison', page: <Bau2ComparisonPage language="vi" />, cards: 7 },
    { name: 'resource farming', page: <ResourcesPage page="resourceOneMha" language="vi" />, cards: 3 },
    { name: 'environment comparison', page: <EnvironmentPage page="environmentBaussComparison" language="vi" />, cards: 2 },
  ])('offers a seasonal view for $name with all relevant metrics and no removed helper content', async ({ page, cards }) => {
    render(page)
    const scopeButtons = document.querySelectorAll<HTMLButtonElement>('.analysis-view-switch button')
    fireEvent.click(scopeButtons[1])
    await screen.findAllByRole('article')
    expect(screen.getAllByRole('article')).toHaveLength(cards)
    expect(document.body).not.toHaveTextContent(/P10|P90|n =|Thời gian mùa vụ|Cách đọc số liệu thử nghiệm/)
    fireEvent.click(scopeButtons[0])
    expect(document.querySelector('.seasonal-comparison')).toBeNull()
  })


  it('uses columns for seasonal rates and lines across years', async () => {
    render(<SeasonalComparison language="en" data={data} config={{ ...config, metrics: ['roi', 'margin'] }} />)
    await waitFor(() => expect(document.querySelectorAll('.recharts-bar')).toHaveLength(4))
    expect(document.querySelector('.seasonal-pie')).toBeNull()
    expect(document.querySelector('.seasonal-model-legend-swatch')).toHaveClass('seasonal-model-legend-swatch--bar')
    fireEvent.click(screen.getByRole('button', { name: 'Across years' }))
    await waitFor(() => expect(document.querySelectorAll('.recharts-line')).toHaveLength(4))
    expect(document.querySelector('.recharts-bar')).toBeNull()
  })

  it('groups columns before doughnuts and labels every cultivated crop bar', async () => {
    render(<SeasonalComparison language="en" data={data} config={{ ...config, metrics: ['income', 'roi', 'cost', 'margin'] }} />)
    expect(screen.getAllByRole('article').map((card) => card.querySelector('h3')?.textContent)).toEqual(['Return on investment (ROI) by crop season during 2027-2050', 'Profit margin by crop season during 2027-2050', 'Composition net income per hectare by crop season during 2027-2050', 'Composition production cost by crop season during 2027-2050'])
    expect(screen.getAllByRole('article')).toHaveLength(4)
    const doughnut = screen.getByRole('article', { name: /Composition net income per hectare by crop season during 2027-2050/ })
    expect(doughnut.querySelector('.chart-unit-label')).toHaveTextContent('%')
    const roi = screen.getByRole('article', { name: /Return on investment \(ROI\) by crop season during 2027-2050/ })
    await waitFor(() => expect(roi.querySelectorAll('.recharts-label-list text')).toHaveLength(6))
    for (const label of roi.querySelectorAll('.recharts-label-list text')) expect(label).not.toHaveTextContent('%')
  })

  it('renders seasonal tables and mobile cards with linked filters and an explicit unplanted third crop', () => {
    render(<SeasonalOverview language="vi" data={data} metrics={seasonalMetricGroups.economics} mode="year" year={2027} period="early" />)
    fireEvent.change(screen.getByLabelText('Nhóm kịch bản'), { target: { value: 'oneMha' } })
    expect((screen.getByLabelText('Hệ canh tác') as HTMLSelectElement).options).toHaveLength(2)
    expect(screen.getAllByRole('article')).toHaveLength(12)
    const table = screen.getByRole('table')
    expect(within(table).getAllByText('Không canh tác')).toHaveLength(4)
    expect(table.querySelectorAll('thead tr:last-child th[scope="col"]')).toHaveLength(seasonalMetricGroups.economics.length + 1)
    expect(table).not.toHaveTextContent(/P10|P90|n =|Thời gian mùa vụ/)
  })
})
