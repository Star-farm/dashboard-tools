import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render } from '@testing-library/react'
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
    expect(abbreviation).toHaveAttribute('data-definition')
    expect(abbreviation.getAttribute('aria-label')).toContain(abbreviation.getAttribute('data-definition'))
  })
})
