import { describe, expect, it } from 'vitest'
import { categoryLabels, translations } from '../src/i18n'
import type { Language } from '../src/i18n'
import { CATEGORIES } from '../src/features/glossary/glossaryData'
import type { CategoryFilter } from '../src/features/glossary/glossaryData'
import { bau3Text } from '../src/features/economics/bau3Text'
import { bauFarmingText } from '../src/features/economics/bauFarmingText'
import { comparisonText } from '../src/features/economics/comparisonText'
import { economicsText } from '../src/features/economics/economicsText'
import { seasonalText } from '../src/features/economics/seasonalText'
import { environmentText } from '../src/features/environment/environmentText'
import { futureText } from '../src/features/future/futureText'
import { mapText } from '../src/features/map/mapText'
import { soilText } from '../src/features/map/soilText'
import { resourceText } from '../src/features/resources/resourceText'
import { scenarioMetricLabels, scenarioText } from '../src/features/scenarios/scenarioText'
import { scenarioMetrics } from '../src/features/scenarios/scenarioTypes'
import { cropPeriods } from '../src/features/economics/seasonalData'

const dictionaries: Record<string, { vi: Record<string, string>; en: Record<string, string> }> = {
  common: translations,
  bau3: bau3Text,
  bauFarming: bauFarmingText,
  comparison: comparisonText,
  economics: economicsText,
  seasonal: seasonalText,
  environment: environmentText,
  future: futureText,
  map: mapText,
  soil: soilText,
  resources: resourceText,
  scenarios: scenarioText,
}

describe('bilingual translation coverage', () => {
  it.each(Object.entries(dictionaries))('%s has matching nonempty English and Vietnamese keys', (_, dictionary) => {
    const viKeys = Object.keys(dictionary.vi).sort()
    const enKeys = Object.keys(dictionary.en).sort()
    expect(enKeys).toEqual(viKeys)
    for (const key of viKeys) {
      expect(dictionary.vi[key].trim(), `vi.${key}`).not.toBe('')
      expect(dictionary.en[key].trim(), `en.${key}`).not.toBe('')
    }
  })

  it('maps every glossary category to a display label in both languages', () => {
    const categories = ['Tất cả', ...CATEGORIES] as CategoryFilter[]
    for (const language of ['vi', 'en'] satisfies Language[]) {
      expect(Object.keys(categoryLabels[language]).sort()).toEqual([...categories].sort())
      for (const category of categories) expect(categoryLabels[language][category].trim()).not.toBe('')
    }
  })

  it('maps every scenario metric and crop code to localized display labels', () => {
    const metrics = scenarioMetrics.map(({ id }) => id)
    for (const language of ['vi', 'en'] satisfies Language[]) {
      expect(Object.keys(scenarioMetricLabels[language]).sort()).toEqual([...metrics].sort())
      for (const metric of metrics) {
        expect(scenarioMetricLabels[language][metric].trim()).not.toBe('')
        expect(scenarioMetricLabels[language][metric]).not.toBe(metric)
      }
      for (const crop of cropPeriods) {
        expect(seasonalText[language][crop].trim()).not.toBe('')
        expect(seasonalText[language][crop]).not.toBe(crop)
      }
    }
  })
})
