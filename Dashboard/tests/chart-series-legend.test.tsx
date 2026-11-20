import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import ChartSeriesLegend from '../src/components/ChartSeriesLegend'

describe('shared chart series legend', () => {
  it.each([
    ['vi', 'Chú giải:'],
    ['en', 'Legend:'],
  ] as const)('shows a localized legend with line and bar symbols in %s', (language, label) => {
    const { container } = render(<ChartSeriesLegend language={language} items={[
      { key: 'line', label: 'Series A', color: '#217348' },
      { key: 'bar', label: 'Series B', color: '#b8322b', kind: 'bar' },
    ]} />)

    expect(screen.getByRole('group', { name: label })).toBeInTheDocument()
    expect(screen.getByText('Series A')).toBeInTheDocument()
    expect(screen.getByText('Series B')).toBeInTheDocument()
    expect(container.querySelectorAll('.chart-legend-swatch')).toHaveLength(2)
    expect(container.querySelector('.chart-legend-swatch--bar')).toBeInTheDocument()
  })

  it('marks scenario abbreviations in static legends', () => {
    const { container } = render(<ChartSeriesLegend language="en" items={[
      { key: 'bau', label: 'BAU 3 seasons', color: '#217348' },
      { key: 'oneMha', label: '1Mha', color: '#b8322b' },
    ]} />)

    expect(container.querySelectorAll('abbr')).toHaveLength(2)
  })
})
