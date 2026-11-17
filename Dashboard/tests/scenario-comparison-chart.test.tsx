import { describe, expect, it } from 'vitest'
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
    fireEvent.click(screen.getByRole('button', { name: /1Mha · solid bars/ }))
    await waitFor(() => expect(container.querySelectorAll('.recharts-bar')).toHaveLength(4))
    fireEvent.click(within(screen.getByRole('group', { name: 'Weather' })).getByRole('button', { name: 'Normal' }))
    fireEvent.click(within(screen.getByRole('group', { name: 'Resources' })).getByRole('button', { name: 'Normal economy' }))
    await waitFor(() => expect(container.querySelectorAll('.recharts-bar')).toHaveLength(1))
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
    expect(screen.getByText(/Year 2027 · Normal weather · Normal resources · 1Mha: 103.00 USD\/ha/)).toBeInTheDocument()
  })





  it('does not invent values when no condition has data', () => {
    const { container } = render(<ScenarioComparisonChart {...props} baseline={[]} oneMha={[]} />)
    expect(screen.getByText(bau3Text.en.noData)).toBeInTheDocument()
    expect(container.querySelectorAll('path.recharts-line-curve')).toHaveLength(0)
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

})
