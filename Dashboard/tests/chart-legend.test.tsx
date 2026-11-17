import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import type { Language } from '../src/i18n'
import Bau3LineChart from '../src/features/economics/Bau3LineChart'
import ResourceLineChart from '../src/features/resources/ResourceLineChart'
import EnvironmentLineChart from '../src/features/environment/EnvironmentLineChart'
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
import { CONDITION_COLORS } from '../src/components/chartStyles'
import economicSource from '../src/data/economics-bau3-series.json'
import resourceSource from '../src/data/resources.json'
import environmentSource from '../src/data/environment.json'
import barSource from '../src/data/economics-comparison.json'

const economic = economicSource as Bau3Data, resources = resourceSource as ResourceData, environment = environmentSource as EnvironmentData
const lineCharts = [
  { name: 'economics', chart: (language: Language) => <Bau3LineChart data={economic} family="bau3s" metric="income" domain={[0, 40000000]} language={language} /> },
  { name: 'resources', chart: (language: Language) => <ResourceLineChart data={resources} family="bau3s" metric="water" domain={[0, 1000]} language={language} /> },
  { name: 'environment', chart: (language: Language) => <EnvironmentLineChart data={environment} family="bau3s" metric="methane" domain={[0, 1000]} language={language} /> },
]
const barCharts = [
  { name: 'economics', chart: <ComparisonBarChart metric="income" cohort={(barSource as EconomicComparisonData).cohorts[0]} language="en" startYear={2027} endYear={2050} /> },
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

  it('shares model selection across comparison charts', () => {
    const cohort = (barSource as EconomicComparisonData).cohorts[0]
    const { container } = render(<ChartSelectionProvider><ComparisonBarChart metric="income" cohort={cohort} language="en" startYear={2027} endYear={2050} /><ComparisonBarChart metric="cost" cohort={cohort} language="en" startYear={2027} endYear={2050} /></ChartSelectionProvider>)
    const legends = screen.getAllByRole('group', { name: 'Choose scenario group' })
    fireEvent.click(within(legends[0]).getByRole('button', { name: '1Mha' }))
    expect(within(legends[1]).getByRole('button', { name: '1Mha' })).toHaveAttribute('aria-pressed', 'true')
    expect(container.querySelectorAll('.recharts-bar-rectangle')).toHaveLength(2)
  })

  it('synchronizes condition and model in paired charts', () => {
    const points = [{ year: 2027, mildNormal: 1, mildShortage: 2, severeNormal: 3, severeShortage: 4 }]
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

  it('shares BAU selection between future income and labor without applying it to AWD', () => {
    const points = [{ year: 2027, first: 20, second: 100 }, { year: 2050, first: 30, second: 80 }]
    render(<ChartSelectionProvider><TimeSeriesChart metric="income" points={points} currency="USD" language="en" /><TimeSeriesChart metric="labor" points={points} currency="USD" language="en" /><TimeSeriesChart metric="methane" points={points} currency="USD" language="en" /></ChartSelectionProvider>)
    const legends = screen.getAllByRole('group', { name: 'Choose scenario group' })
    fireEvent.click(within(legends[0]).getByRole('button', { name: '1Mha' }))
    expect(within(legends[1]).getByRole('button', { name: '1Mha' })).toHaveAttribute('aria-pressed', 'true')
    expect(within(legends[2]).getByRole('button', { name: 'All' })).toHaveAttribute('aria-pressed', 'true')
  })
  it.each(lineCharts)('isolates one condition, keeps repeated selections and restores all lines in $name', ({ chart }) => {
    const { container, rerender } = render(chart('vi'))
    expect(container.querySelectorAll('path.recharts-line-curve')).toHaveLength(4)
    expect([...container.querySelectorAll('.chart-legend-marker .scenario-dot')].map((dot) => dot.getAttribute('data-marker'))).toEqual(['circle', 'square', 'triangle', 'diamond'])
    expect([...new Set([...container.querySelectorAll('.recharts-line-dots .scenario-dot')].map((dot) => dot.getAttribute('data-marker')))]).toEqual(['circle', 'square', 'triangle', 'diamond'])
    for (const line of container.querySelectorAll('path.recharts-line-curve')) {
      expect(line).toHaveAttribute('stroke-width', '3')
      expect(line).toHaveAttribute('stroke-opacity', '1')
    }
    fireEvent.click(within(screen.getByRole('group', { name: 'Thời tiết' })).getByRole('button', { name: 'Khắc nghiệt' }))
    fireEvent.click(within(screen.getByRole('group', { name: 'Tài nguyên' })).getByRole('button', { name: 'Thiếu tài nguyên' }))
    expect(container.querySelectorAll('path.recharts-line-curve')).toHaveLength(1)
    expect(container.querySelector('path.recharts-line-curve')).toHaveAttribute('stroke', CONDITION_COLORS.severeShortage)
    expect(container.querySelectorAll('.recharts-line-dots .scenario-dot')).toHaveLength(24)
    rerender(chart('en'))
    expect(within(screen.getByRole('group', { name: 'Weather' })).getByRole('button', { name: 'Severe' })).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(within(screen.getByRole('group', { name: 'Weather' })).getByRole('button', { name: 'Normal' }))
    fireEvent.click(within(screen.getByRole('group', { name: 'Resources' })).getByRole('button', { name: 'Normal economy' }))
    expect(container.querySelector('path.recharts-line-curve')).toHaveAttribute('stroke', CONDITION_COLORS.mildNormal)
    fireEvent.click(within(screen.getByRole('group', { name: 'Weather' })).getByRole('button', { name: 'All' }))
    fireEvent.click(within(screen.getByRole('group', { name: 'Resources' })).getByRole('button', { name: 'All' }))
    expect(container.querySelectorAll('path.recharts-line-curve')).toHaveLength(4)
  })

  it.each(barCharts)('filters a single group in the bars and displayed values in $name', ({ chart }) => {
    const { container } = render(chart)
    expect(container.querySelectorAll('.recharts-bar-rectangle')).toHaveLength(2)
    fireEvent.click(screen.getByRole('button', { name: '1Mha' }))
    expect(container.querySelectorAll('.recharts-bar-rectangle')).toHaveLength(1)
    expect(container.querySelectorAll('.comparison-values > div')).toHaveLength(1)
    expect(container.querySelector('.comparison-values')).toHaveTextContent('1Mha')
    fireEvent.click(screen.getByRole('button', { name: 'All' }))
    expect(container.querySelectorAll('.recharts-bar-rectangle')).toHaveLength(2)
    expect(container.querySelectorAll('.comparison-values > div')).toHaveLength(2)
  })

  it.each(['income', 'methane'] as const)('filters the future %s chart by scenario or AWD group', (metric) => {
    const { container } = render(<TimeSeriesChart metric={metric} points={[{ year: 2027, first: 20, second: 100 }, { year: 2050, first: 30, second: 80 }]} currency="USD" language="en" />)
    fireEvent.click(screen.getByRole('button', { name: metric === 'income' ? '1Mha' : 'With AWD' }))
    expect(container.querySelectorAll('path.recharts-line-curve')).toHaveLength(1)
    expect(container.querySelector('path.recharts-line-curve')).toHaveAttribute('stroke', '#217348')
    fireEvent.click(screen.getByRole('button', { name: metric === 'income' ? 'Business as usual' : 'Without AWD' }))
    expect(container.querySelectorAll('path.recharts-line-curve')).toHaveLength(1)
    expect(container.querySelector('path.recharts-line-curve')).toHaveAttribute('stroke', '#b8322b')
    fireEvent.click(screen.getByRole('button', { name: 'All' }))
    expect(container.querySelectorAll('path.recharts-line-curve')).toHaveLength(2)
  })
})
