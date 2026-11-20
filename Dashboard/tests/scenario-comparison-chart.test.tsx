import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import ScenarioComparisonChart from '../src/components/ScenarioComparisonChart'
import { bau3Text } from '../src/features/economics/bau3Text'

const point = (year: number, value: number) => ({ year, severeShortage: value, severeNormal: value + 1, mildShortage: value + 2, mildNormal: value + 3 })
const props = {
  language: 'en' as const, title: 'Net income', baselineLabel: 'BAU 3 seasons', startYear: 2027, endYear: 2050,
  baseline: [point(2050, -10), point(2027, 10)], oneMha: [point(2027, 100), point(2050, 200)],
  domain: [-50, 250] as [number, number], unit: 'USD/ha', formatValue: (value: number) => value.toFixed(2),
}

describe('combined scenario chart', () => {
  it('renders grouped bars for rates and retains model and condition filtering', async () => {
    const { container } = render(<ScenarioComparisonChart {...props} chartType="bar" />)
    await waitFor(() => expect(container.querySelectorAll('.recharts-bar')).toHaveLength(8))
    expect(container.querySelectorAll('.recharts-line')).toHaveLength(0)
    fireEvent.click(within(screen.getByRole('group', { name: 'Choose comparison models' })).getByRole('button', { name: /1Mha/ }))
    await waitFor(() => expect(container.querySelectorAll('.recharts-bar')).toHaveLength(4))
    fireEvent.click(within(screen.getByRole('group', { name: 'Weather' })).getByRole('button', { name: 'Normal' }))
    fireEvent.click(within(screen.getByRole('group', { name: 'Resources' })).getByRole('button', { name: 'Normal economy' }))
    await waitFor(() => expect(container.querySelectorAll('.recharts-bar')).toHaveLength(1))
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
    expect(screen.getByText(/Year 2027 · Normal weather · Normal resources · 1Mha: 103.00 USD\/ha/)).toBeInTheDocument()
  })

  it('shows chart values in the three-column comparison tooltip on hover', async () => {
    const { container } = render(<ScenarioComparisonChart {...props} />)
    const wrapper = container.querySelector<HTMLElement>('.recharts-wrapper')!
    Object.defineProperty(wrapper, 'offsetWidth', { value: 620 })
    Object.defineProperty(wrapper, 'offsetHeight', { value: 340 })
    vi.spyOn(wrapper, 'getBoundingClientRect').mockReturnValue({ x: 0, y: 0, left: 0, top: 0, width: 620, height: 340, right: 620, bottom: 340, toJSON: () => ({}) })

    expect(container.querySelector('.bau3-chart-note')).not.toBeInTheDocument()
    const dot = container.querySelector('.recharts-line-dots .scenario-dot')!
    fireEvent.mouseMove(dot, { clientX: Number(dot.getAttribute('data-cx')), clientY: Number(dot.getAttribute('data-cy')) })

    const tooltip = container.querySelector('.recharts-tooltip-wrapper')!
    await waitFor(() => expect(tooltip).toHaveStyle({ visibility: 'visible' }))
    expect(tooltip).toHaveTextContent('Year 2027')
    expect(within(tooltip as HTMLElement).getByRole('columnheader', { name: 'Condition' })).toBeInTheDocument()
    expect(within(tooltip as HTMLElement).getAllByRole('columnheader')[1]).toHaveTextContent('BAU')
    expect(within(tooltip as HTMLElement).getAllByRole('columnheader')[2]).toHaveTextContent('1Mha')
    expect(tooltip).toHaveTextContent('Severe weather · Resource shortage')
    expect(tooltip).toHaveTextContent('10.00')
    expect(tooltip).toHaveTextContent('100.00')
    expect(container.querySelector('.chart-unit-label')).toHaveTextContent('Unit: USD/ha')
  })

  it('does not invent values when no condition has data', () => {
    const { container } = render(<ScenarioComparisonChart {...props} baseline={[]} oneMha={[]} />)
    expect(screen.getByText(bau3Text.en.noData)).toBeInTheDocument()
    expect(container.querySelectorAll('path.recharts-line-curve')).toHaveLength(0)
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

})
