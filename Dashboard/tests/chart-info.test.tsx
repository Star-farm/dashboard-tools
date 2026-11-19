import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import ChartInfo from '../src/components/ChartInfo'

describe('chart tooltip display', () => {
  it('uses the model color for comparison series', () => {
    const { container } = render(<ChartInfo active label={2045} format={String} payload={[{
      name: 'BAU 3 seasons · Severe · Shortage',
      value: 4.99,
      dataKey: 'bau_severeShortage',
      color: '#2868b2',
      payload: { group: 'bau', label: 'Severe · Shortage' },
    }]} />)

    expect(container.querySelector('.chart-info-swatch')).toHaveAttribute('style', 'background-color: rgb(184, 50, 43);')
  })

  it('uses a square for resource shortage and a circle for normal resources', () => {
    const { container } = render(<ChartInfo active format={String} payload={[
      { name: 'Severe weather · Resource shortage', value: 4, dataKey: 'oneMha_severeShortage', color: '#217348' },
      { name: 'Normal weather · Normal resources', value: 5, dataKey: 'oneMha_mildNormal', color: '#217348' },
    ]} />)

    expect(container.querySelectorAll('.chart-info-swatch--square')).toHaveLength(1)
    expect(container.querySelectorAll('.chart-info-swatch--circle')).toHaveLength(1)
  })

  it('shows compact bilingual condition labels for comparison tooltips', () => {
    const { container, rerender } = render(<ChartInfo active label={2037} language="vi" format={String} payload={[{
      name: 'BAU 3 vụ · Khác nghiệt · Khan hiếm tài nguyên',
      value: 8.99,
      dataKey: 'bau_severeShortage',
      color: '#b8322b',
      payload: { group: 'bau' },
    }]} />)

    expect(container.querySelector('.chart-tooltip-mobile-label')).toHaveTextContent('BAU · Khắc nghiệt')
    expect(container.querySelector('.chart-info-swatch')).toHaveAttribute('style', 'background-color: rgb(184, 50, 43);')

    rerender(<ChartInfo active label={2037} language="en" format={String} payload={[{
      name: 'BAU 3 seasons · Severe · Resource shortage',
      value: 8.99,
      dataKey: 'bau_severeShortage',
      payload: { group: 'bau' },
    }]} />)
    expect(container.querySelector('.chart-tooltip-mobile-label')).toHaveTextContent('BAU · Severe weather')
  })

  it('omits the unit from tooltip values', () => {
    render(<ChartInfo active label={2030} yearLabel="Year" format={(value) => value.toFixed(2)} unit="t/ha" payload={[{ name: 'Yield', value: 4.25, color: '#217348' }]} />)

    expect(screen.getByText('Year 2030')).toBeInTheDocument()
    expect(screen.getByText('4.25')).toBeInTheDocument()
    expect(screen.queryByText('t/ha')).not.toBeInTheDocument()
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
