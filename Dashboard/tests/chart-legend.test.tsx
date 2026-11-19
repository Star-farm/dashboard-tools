import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import type { Language } from '../src/i18n'
import Bau3LineChart from '../src/features/economics/Bau3LineChart'
import ResourceLineChart from '../src/features/resources/ResourceLineChart'
import TimeSeriesChart from '../src/features/future/TimeSeriesChart'
import ComparisonBarChart from '../src/features/economics/ComparisonBarChart'
import ResourceBarChart from '../src/features/resources/ResourceBarChart'
import EnvironmentBarChart from '../src/features/environment/EnvironmentBarChart'
import type { Bau3Data } from '../src/features/economics/bau3Types'
import type { ResourceData } from '../src/features/resources/resourceTypes'
import type { EnvironmentData } from '../src/features/environment/environmentTypes'
import type { EconomicComparisonData } from '../src/features/economics/comparisonData'
import { ChartSelectionProvider } from '../src/components/ChartSelection'
import { within } from '@testing-library/react'
import ScenarioComparisonChart from '../src/components/ScenarioComparisonChart'
import ChartUnitLabel from '../src/components/ChartUnitLabel'
import { SCENARIO_COLORS } from '../src/components/chartStyles'
import economicSource from '../src/data/economics-bau3-series.json'
import resourceSource from '../src/data/resources.json'
import environmentSource from '../src/data/environment.json'
import barSource from '../src/data/economics-comparison.json'

const economic = economicSource as Bau3Data, resources = resourceSource as ResourceData, environment = environmentSource as EnvironmentData

describe('chart unit labels', () => {
  it('translates the unit prefix when the display language changes', () => {
    const { rerender } = render(<ChartUnitLabel language="vi" unit="kg/ha" />)
    expect(screen.getByText('Đơn vị: kg/ha')).toBeInTheDocument()

    rerender(<ChartUnitLabel language="en" unit="kg/ha" />)
    expect(screen.getByText('Unit: kg/ha')).toBeInTheDocument()
    expect(screen.queryByText('Đơn vị: kg/ha')).not.toBeInTheDocument()
  })
})

const lineCharts = [
  { name: 'economics', chart: (language: Language) => <Bau3LineChart data={economic} family="bau3s" metric="income" domain={[0, 40000000]} language={language} /> },
  { name: 'resources', chart: (language: Language) => <ResourceLineChart data={resources} family="bau3s" metric="water" domain={[0, 1000]} language={language} /> },
]
const barCharts = [
  { name: 'resources', chart: <ResourceBarChart data={resources} series={resources.series} metric="water" language="en" /> },
  { name: 'environment', chart: <EnvironmentBarChart data={environment} series={environment.series} metric="methane" language="en" /> },
]

describe('interactive legends across chart pages', () => {
  it('shares condition selection across charts in one page and restores them together', () => {
    const { container } = render(<ChartSelectionProvider><Bau3LineChart data={economic} family="bau3s" metric="income" domain={[0, 40000000]} language="en" /><Bau3LineChart data={economic} family="bau3s" metric="cost" domain={[0, 40000000]} language="en" /></ChartSelectionProvider>)
    const weather = screen.getAllByRole('group', { name: 'Weather' })
    const resource = screen.getAllByRole('group', { name: 'Resources' })
    fireEvent.click(within(weather[0]).getByRole('button', { name: 'Severe' }))
    expect(container.querySelectorAll('path.recharts-line-curve')).toHaveLength(4)
    fireEvent.click(within(resource[0]).getByRole('button', { name: 'Resource shortage' }))
    expect(within(weather[1]).getByRole('button', { name: 'Severe' })).toHaveAttribute('aria-pressed', 'true')
    expect(within(resource[1]).getByRole('button', { name: 'Resource shortage' })).toHaveAttribute('aria-pressed', 'true')
    expect(container.querySelectorAll('path.recharts-line-curve')).toHaveLength(2)
    fireEvent.click(within(weather[1]).getByRole('button', { name: 'All' }))
    fireEvent.click(within(resource[1]).getByRole('button', { name: 'All' }))
    expect(container.querySelectorAll('path.recharts-line-curve')).toHaveLength(8)
  })

  it.each(['vi', 'en'] as const)('keeps both scenario groups visible on economics comparison charts without a selector in %s', (language) => {
    const cohort = (barSource as EconomicComparisonData).cohorts[0]
    const { container } = render(<ChartSelectionProvider><ComparisonBarChart metric="income" cohort={cohort} language={language} startYear={2027} endYear={2050} /><ComparisonBarChart metric="cost" cohort={cohort} language={language} startYear={2027} endYear={2050} /></ChartSelectionProvider>)
    expect(screen.queryByRole('group', { name: /Choose scenario group|Chọn nhóm kịch bản/ })).not.toBeInTheDocument()
    expect(container.querySelectorAll('.recharts-bar-rectangle')).toHaveLength(4)
    expect(container.querySelectorAll('.comparison-values > div')).toHaveLength(4)
  })

  it('synchronizes condition and model in paired charts', () => {
    const points = [{ year: 2027, mildNormal: 1, mildShortage: 2, severeNormal: 3, severeShortage: 4 }, { year: 2028, mildNormal: 2, mildShortage: 3, severeNormal: 4, severeShortage: 5 }]
    const chart = (title: string) => <ScenarioComparisonChart language="en" title={title} baselineLabel="BAU" baseline={points} oneMha={points} startYear={2027} endYear={2027} domain={[0, 5]} unit="kg" formatValue={String} />
    render(<ChartSelectionProvider>{chart('Income')}{chart('Cost')}</ChartSelectionProvider>)
    const weather = screen.getAllByRole('group', { name: 'Weather' })
    const resources = screen.getAllByRole('group', { name: 'Resources' })
    fireEvent.click(within(weather[0]).getByRole('button', { name: 'Severe' }))
    fireEvent.click(within(resources[0]).getByRole('button', { name: 'Resource shortage' }))
    expect(within(weather[1]).getByRole('button', { name: 'Severe' })).toHaveAttribute('aria-pressed', 'true')
    expect(within(resources[1]).getByRole('button', { name: 'Resource shortage' })).toHaveAttribute('aria-pressed', 'true')
    const models = screen.getAllByRole('group', { name: 'Choose comparison models' })
    fireEvent.click(within(models[1]).getByRole('button', { name: /1Mha/ }))
    expect(within(models[0]).getByRole('button', { name: /1Mha/ })).toHaveAttribute('aria-pressed', 'true')
  })

  it('keeps the BAU line solid when selected alone', () => {
    const points = [{ year: 2027, mildNormal: 1, mildShortage: 2, severeNormal: 3, severeShortage: 4 }, { year: 2028, mildNormal: 2, mildShortage: 3, severeNormal: 4, severeShortage: 5 }]
    render(<ScenarioComparisonChart language="en" title="Income" baselineLabel="BAU" baseline={points} oneMha={points} startYear={2027} endYear={2028} domain={[0, 5]} unit="kg" formatValue={String} />)

    const legend = screen.getByRole('group', { name: 'Choose comparison models' })
    const bauButton = within(legend).getByRole('button', { name: /BAU:/ })
    fireEvent.click(bauButton)
    expect(bauButton).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(within(screen.getByRole('group', { name: 'Weather' })).getByRole('button', { name: 'Normal' }))
    expect(document.querySelectorAll('.comparison-combined-plot .recharts-line-curve')).toHaveLength(2)
    for (const line of document.querySelectorAll('.comparison-combined-plot .recharts-line-curve')) expect(line).not.toHaveAttribute('stroke-dasharray')
  })

  it('keeps both series visible on future charts without scenario group selectors', () => {
    const points = [{ year: 2027, first: 20, second: 100 }, { year: 2050, first: 30, second: 80 }]
    const { container } = render(<ChartSelectionProvider><TimeSeriesChart metric="income" points={points} currency="USD" language="en" /><TimeSeriesChart metric="labor" points={points} currency="USD" language="en" /><TimeSeriesChart metric="methane" points={points} currency="USD" language="en" /></ChartSelectionProvider>)
    expect(screen.queryByRole('group', { name: 'Choose scenario group' })).not.toBeInTheDocument()
    expect(container.querySelectorAll('path.recharts-line-curve')).toHaveLength(6)
  })
  it.each(lineCharts)('isolates one condition, keeps repeated selections and restores all lines in $name', ({ chart }) => {
    const { container, rerender } = render(chart('vi'))
    expect(container.querySelectorAll('path.recharts-line-curve')).toHaveLength(4)
    for (const line of container.querySelectorAll('path.recharts-line-curve')) {
      expect(line).toHaveAttribute('stroke-width', '3')
      expect(line).toHaveAttribute('stroke-opacity', '1')
    }
    fireEvent.click(within(screen.getByRole('group', { name: 'Thời tiết' })).getByRole('button', { name: 'Khắc nghiệt' }))
    fireEvent.click(within(screen.getByRole('group', { name: 'Tài nguyên' })).getByRole('button', { name: 'Khan hiếm tài nguyên' }))
    expect(container.querySelectorAll('path.recharts-line-curve')).toHaveLength(1)
    expect(container.querySelector('path.recharts-line-curve')).toHaveAttribute('stroke', SCENARIO_COLORS.bau)
    expect(container.querySelector('.recharts-line-dots .scenario-dot')).toHaveAttribute('data-marker', 'square')
    expect(container.querySelectorAll('.recharts-line-dots .scenario-dot')).toHaveLength(24)
    rerender(chart('en'))
    expect(within(screen.getByRole('group', { name: 'Weather' })).getByRole('button', { name: 'Severe' })).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(within(screen.getByRole('group', { name: 'Weather' })).getByRole('button', { name: 'Normal' }))
    fireEvent.click(within(screen.getByRole('group', { name: 'Resources' })).getByRole('button', { name: 'Normal economy' }))
    expect(container.querySelector('path.recharts-line-curve')).toHaveAttribute('stroke', SCENARIO_COLORS.bau)
    fireEvent.click(within(screen.getByRole('group', { name: 'Weather' })).getByRole('button', { name: 'All' }))
    fireEvent.click(within(screen.getByRole('group', { name: 'Resources' })).getByRole('button', { name: 'All' }))
    expect(container.querySelectorAll('path.recharts-line-curve')).toHaveLength(4)
  })

  it.each(barCharts)('shows both model groups without a selector in $name', ({ chart }) => {
    const { container } = render(chart)
    expect(container.querySelectorAll('.recharts-bar-rectangle')).toHaveLength(2)
    expect(screen.queryByRole('group', { name: 'Choose scenario group' })).not.toBeInTheDocument()
    expect(container.querySelectorAll('.comparison-values > div')).toHaveLength(2)
  })

  it.each(['vi', 'en'] as const)('omits the future scenario selector in %s while keeping both lines', (language) => {
    const { container } = render(<TimeSeriesChart metric="income" points={[{ year: 2027, first: 20, second: 100 }, { year: 2050, first: 30, second: 80 }]} currency="USD" language={language} />)
    expect(screen.queryByRole('group', { name: /scenario group|nhóm kịch bản/i })).not.toBeInTheDocument()
    expect(container.querySelectorAll('path.recharts-line-curve')).toHaveLength(2)
    expect(container.querySelector('path.recharts-line-curve')).toHaveAttribute('stroke', '#217348')
    expect(container.querySelectorAll('path.recharts-line-curve')[1]).toHaveAttribute('stroke', '#b8322b')
  })
})
