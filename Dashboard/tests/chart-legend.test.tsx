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
  it.each(lineCharts)('isolates one condition, keeps repeated selections and restores all lines in $name', ({ chart }) => {
    const { container, rerender } = render(chart('vi'))
    expect(container.querySelectorAll('path.recharts-line-curve')).toHaveLength(4)
    const select = screen.getByRole('button', { name: 'Khắc nghiệt · Thiếu tài nguyên' })
    fireEvent.click(select)
    fireEvent.click(select)
    expect(container.querySelectorAll('path.recharts-line-curve')).toHaveLength(1)
    expect(container.querySelector('path.recharts-line-curve')).toHaveAttribute('stroke', '#3478c6')
    expect(container.querySelectorAll('circle.recharts-line-dot')).toHaveLength(24)
    rerender(chart('en'))
    expect(screen.getByRole('button', { name: 'Severe weather · Resource shortage' })).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(screen.getByRole('button', { name: 'Normal weather · Normal resources' }))
    expect(container.querySelector('path.recharts-line-curve')).toHaveAttribute('stroke', '#589044')
    fireEvent.click(screen.getByRole('button', { name: 'All conditions' }))
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
    expect(container.querySelector('path.recharts-line-curve')).toHaveAttribute('stroke', '#2f8050')
    fireEvent.click(screen.getByRole('button', { name: metric === 'income' ? 'Business as usual' : 'Without AWD' }))
    expect(container.querySelectorAll('path.recharts-line-curve')).toHaveLength(1)
    expect(container.querySelector('path.recharts-line-curve')).toHaveAttribute('stroke', '#bf554c')
    fireEvent.click(screen.getByRole('button', { name: 'All' }))
    expect(container.querySelectorAll('path.recharts-line-curve')).toHaveLength(2)
  })
})
