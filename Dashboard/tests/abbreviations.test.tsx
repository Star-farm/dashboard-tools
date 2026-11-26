import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import EmphasizedNumbers from '../src/components/EmphasizedNumbers'
import ScenarioAbbreviations from '../src/components/ScenarioAbbreviations'

afterEach(cleanup)

describe('scenario names in insights', () => {
  it('spells out BAU and 1Mha without scenario colors in both languages', () => {
    document.documentElement.lang = 'vi'
    const { container, rerender } = render(<EmphasizedNumbers text="BAU compared with 1Mha" />)
    expect(container.textContent).toBe('canh tác như thường lệ compared with đề án một triệu hecta lúa chất lượng cao, phát thải thấp')
    expect(container.querySelectorAll('abbr')).toHaveLength(0)
    expect(container.querySelector('.scenario-insight-model')).not.toHaveClass('scenario-model-bau')
    expect(container.querySelector('.scenario-insight-model')).not.toHaveClass('scenario-model-one-mha')

    document.documentElement.lang = 'en'
    rerender(<EmphasizedNumbers text="BAU compared with 1Mha" />)
    expect(container.textContent).toBe('business-as-usual farming compared with the one-million-hectare high-quality, low-emission rice program')
    expect(container.querySelectorAll('abbr')).toHaveLength(0)
  })

  it('keeps the styled definition popup without the browser native tooltip', () => {
    const { container } = render(<ScenarioAbbreviations text="1Mha" language="vi" />)
    const abbreviation = container.querySelector('abbr')!
    expect(abbreviation).not.toHaveAttribute('title')
    expect(abbreviation).toHaveAttribute('aria-label', expect.stringContaining('1Mha:'))
    fireEvent.focus(abbreviation)
    expect(screen.getByRole('tooltip')).toHaveTextContent(abbreviation.getAttribute('aria-label')!.replace('1Mha: ', ''))
  })

  it('marks every BAU and 1Mha occurrence in inline content', () => {
    const { container } = render(<ScenarioAbbreviations text="BAU3S compared with 1Mha, Thường lệ, Canh tác như thường lệ and Business as usual farming" language="vi" />)
    expect(container.querySelectorAll('abbr')).toHaveLength(5)
    expect(Array.from(container.querySelectorAll('abbr'), (item) => item.textContent)).toEqual(['BAU', '1Mha', 'Thường lệ', 'Canh tác như thường lệ', 'Business as usual farming'])
    const bauDefinitions = Array.from(container.querySelectorAll('abbr')).filter((item) => item.textContent !== '1Mha').map((item) => item.getAttribute('data-definition'))
    expect(new Set(bauDefinitions).size).toBe(1)
  })
})
