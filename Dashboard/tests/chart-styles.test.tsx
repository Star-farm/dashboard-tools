import { describe, expect, it } from 'vitest'
import { CONDITION_MARKERS, scenarioLineStyle } from '../src/components/chartStyles'
import { render } from '@testing-library/react'
import { ConditionLegend } from '../src/components/ConditionFilters'
import { bau3Conditions } from '../src/features/economics/bau3Types'

describe('scenario chart encodings', () => {
  it('uses scenario colors, climate line patterns, and resource marker shapes', () => {
    expect(scenarioLineStyle('oneMha', 'mildNormal').stroke).toBe('#217348')
    expect(scenarioLineStyle('bau', 'mildNormal').stroke).toBe('#b8322b')
    expect(scenarioLineStyle('oneMha', 'mildNormal').strokeDasharray).toBeUndefined()
    expect(scenarioLineStyle('bau', 'mildShortage').strokeDasharray).toBeUndefined()
    expect(scenarioLineStyle('oneMha', 'severeNormal').strokeDasharray).toBe('6 3')
    expect(scenarioLineStyle('bau', 'severeShortage').strokeDasharray).toBe('6 3')
    expect(CONDITION_MARKERS.mildNormal).toBe('circle')
    expect(CONDITION_MARKERS.severeNormal).toBe('circle')
    expect(CONDITION_MARKERS.mildShortage).toBe('triangle')
    expect(CONDITION_MARKERS.severeShortage).toBe('triangle')
  })

  it('shows climate line and resource marker encodings in the condition legend', () => {
    const { container } = render(<ConditionLegend language="en" conditions={bau3Conditions} />)
    const items = Array.from(container.querySelectorAll('.condition-key li'))
    expect(items).toHaveLength(4)
    expect(container.querySelectorAll('.condition-legend-group')).toHaveLength(2)
    expect(items.filter((item) => item.querySelector('.encoding-line--dashed'))).toHaveLength(1)
    expect(items.filter((item) => item.querySelector('.encoding-marker--circle'))).toHaveLength(1)
    expect(items.filter((item) => item.querySelector('.encoding-marker--triangle'))).toHaveLength(1)
  })
})
