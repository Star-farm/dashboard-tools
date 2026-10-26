import { describe, expect, it } from 'vitest'
import { metricUnit } from '../src/features/future/chartAnalysis'
import { bau3Unit } from '../src/features/economics/bau3Analysis'
import { economicsText } from '../src/features/economics/economicsText'
import { scenarioText } from '../src/features/scenarios/scenarioText'
import { resourceUnit } from '../src/features/resources/resourceAnalysis'
import { environmentUnit } from '../src/features/environment/environmentAnalysis'
import { environmentText } from '../src/features/environment/environmentText'
import { scenarioChangeTone } from '../src/features/scenarios/scenarioAnalysis'

describe('consistent display language', () => {
  it('uses USD and ton consistently on English pages', () => {
    expect(metricUnit('income', 'USD', 'en')).toBe('USD/ha')
    expect(bau3Unit('income', 'en')).toBe(economicsText.en.moneyUnit)
    expect(bau3Unit('yield', 'en')).toBe('ton/ha')
    expect(scenarioText.en.yieldUnit).toBe('ton/ha')
    expect(environmentUnit('intensity', 'en')).toBe('kg Methane/ton rice')
  })
  it.each(['vi', 'en'] as const)('spells out methane and nitrogen in %s', (language) => {
    const methane = language === 'vi' ? 'Metan' : 'Methane', nitrogen = language === 'vi' ? 'Nito' : 'Nitrogen'
    expect(metricUnit('methane', 'USD', language)).toBe(`kg ${methane}/ha`)
    expect(environmentUnit('methane', language)).toBe(`kg ${methane}/ha`)
    expect(scenarioText[language].methaneUnit).toBe(`kg ${methane}/ha`)
    expect(resourceUnit('fertilizer', language)).toBe(`kg ${nitrogen}/ha`)
    expect(scenarioText[language].fertilizerUnit).toBe(`kg ${nitrogen}/ha`)
  })
  it('localizes percentage-point notation and colors changes by the preferred metric direction', () => {
    expect(environmentText.vi.points).toBe('điểm %')
    expect(environmentText.en.points).toBe('pp')
    expect(scenarioChangeTone('income', 10)).toBe('good')
    expect(scenarioChangeTone('income', -10)).toBe('bad')
    expect(scenarioChangeTone('cost', 10)).toBe('bad')
    expect(scenarioChangeTone('methane', -10)).toBe('good')
    expect(scenarioChangeTone('water', 0)).toBe('neutral')
    expect(scenarioChangeTone('yield', null)).toBe('neutral')
  })
})
