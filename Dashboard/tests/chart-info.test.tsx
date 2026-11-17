import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import ChartInfo from '../src/components/ChartInfo'

describe('chart tooltip display', () => {
  it('keeps the value and unit separate so mobile styles can hide only the unit', () => {
    render(<ChartInfo active label={2030} yearLabel="Year" format={(value) => value.toFixed(2)} unit="t/ha" payload={[{ name: 'Yield', value: 4.25, color: '#217348' }]} />)

    expect(screen.getByText('Year 2030')).toBeInTheDocument()
    expect(screen.getByText('4.25')).toBeInTheDocument()
    expect(screen.getByText('t/ha')).toHaveClass('chart-info-unit')
  })

  it.each(['Business As Usual · severe shortage', 'Canh tác như thường lệ · thiếu nước nghiêm trọng'])(
    'uses BAU for mobile display label %s',
    (name) => {
      render(<ChartInfo active label={2030} format={(value) => String(value)} payload={[{ name, value: 4, color: '#217348' }]} />)

      expect(screen.getByText(/BAU/)).toHaveClass('chart-tooltip-mobile-label')
      expect(screen.getByText(name)).toHaveClass('chart-tooltip-desktop-label')
    },
  )

  it('uses the BAU abbreviation for the localized short baseline label', () => {
    render(<ChartInfo active label={2030} format={(value) => String(value)} payload={[{ name: 'Average income', value: 4, payload: { group: 'bau', label: 'Thường lệ' } }]} />)

    expect(screen.getByText('BAU')).toHaveClass('chart-tooltip-mobile-label')
    expect(screen.getByText('Thường lệ')).toHaveClass('chart-tooltip-desktop-label')
  })
})
