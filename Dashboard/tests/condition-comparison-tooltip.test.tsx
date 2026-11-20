import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import ConditionComparisonTooltip from '../src/components/ConditionComparisonTooltip'

describe('condition comparison tooltip', () => {
  it('groups BAU and 1Mha values into three localized columns', () => {
    render(<ConditionComparisonTooltip active label={2037} yearLabel="Year" language="en" format={(value) => value.toFixed(2)} unit="ton/ha" payload={[
      { dataKey: 'bau_severeShortage', value: 6.65 },
      { dataKey: 'oneMha_severeShortage', value: 6.41 },
      { dataKey: 'bau_mildNormal', value: null },
      { dataKey: 'oneMha_mildNormal', value: 6.57 },
    ]} />)

    const table = screen.getByRole('table')
    expect(within(table).getAllByRole('columnheader').map((header) => header.textContent)).toEqual(['Condition', 'BAU', '1Mha'])
    const rows = within(table).getAllByRole('row')
    expect(rows).toHaveLength(3)
    expect(rows[1]).toHaveTextContent('Severe weather · Resource shortage')
    expect(rows[1]).toHaveTextContent('6.65')
    expect(rows[1]).toHaveTextContent('6.41')
    expect(rows[2]).toHaveTextContent('-')
    expect(rows[2]).toHaveTextContent('6.57')
    expect(screen.queryByText('ton/ha')).not.toBeInTheDocument()
  })

  it('keeps the existing tooltip shell and localizes the condition header in Vietnamese', () => {
    const { container } = render(<ConditionComparisonTooltip active label={2037} yearLabel="Năm" language="vi" format={String} payload={[
      { dataKey: 'bau_severeNormal', value: 6.65 },
      { dataKey: 'oneMha_severeNormal', value: 6.41 },
    ]} />)
    expect(container.querySelector('.chart-info')).toBeInTheDocument()
    expect(screen.getByRole('table')).toHaveTextContent('Điều kiện')
    expect(screen.getByText('Năm 2037')).toBeInTheDocument()
  })

  it('shows both model colors with the resource marker shape beside each condition', () => {
    const { container } = render(<ConditionComparisonTooltip active label={2037} yearLabel="Year" language="en" format={String} payload={[
      { dataKey: 'bau_severeShortage', value: 6.65 },
      { dataKey: 'oneMha_severeShortage', value: 6.41 },
    ]} />)
    const markers = Array.from(container.querySelectorAll('.chart-info-condition-marker .scenario-dot'))

    expect(markers).toHaveLength(2)
    expect(markers.map((marker) => marker.getAttribute('data-marker'))).toEqual(['triangle', 'triangle'])
    expect(markers.map((marker) => marker.getAttribute('fill'))).toEqual(['#b8322b', '#217348'])
  })
})
