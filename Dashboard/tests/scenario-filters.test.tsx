import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import type { Language } from '../src/i18n'
import EconomicOverviewPage from '../src/features/economics/EconomicOverviewPage'
import ResourceOverview from '../src/features/resources/ResourceOverview'
import EnvironmentOverview from '../src/features/environment/EnvironmentOverview'
import { economicsText } from '../src/features/economics/economicsText'
import type { EconomicFilters } from '../src/features/economics/economicsData'
import type { ResourceData } from '../src/features/resources/resourceTypes'
import type { EnvironmentData } from '../src/features/environment/environmentTypes'
import resourceData from '../src/data/resources-overview.json'
import environmentData from '../src/data/environment-overview.json'

const pages = [
  { name: 'economics', render: (language: Language) => <EconomicOverviewPage language={language} /> },
  { name: 'resources', render: (language: Language) => <ResourceOverview data={resourceData as Pick<ResourceData, 'rows'>} language={language} /> },
  { name: 'environment', render: (language: Language) => <EnvironmentOverview data={environmentData as Pick<EnvironmentData, 'rows'>} language={language} /> },
]

describe.each(pages)('$name linked dropdowns', ({ render: page }) => {
  it.each(['vi', 'en'] as const)('cascades left to right and resets all downstream selections in %s', (language) => {
    const t = economicsText[language]
    const { rerender } = render(page(language))
    const select = (key: keyof EconomicFilters) => screen.getByRole('combobox', { name: t[key] }) as HTMLSelectElement
    const choose = (key: keyof EconomicFilters, value: string) => {
      expect(within(select(key)).getByRole('option', { name: value === 'all' ? t.all : t[value as keyof typeof t] })).toHaveValue(value)
      fireEvent.change(select(key), { target: { value } })
    }
    const options = (key: keyof EconomicFilters) => Array.from(select(key).options, (option) => option.value)
    const reset = () => fireEvent.click(screen.getByRole('button', { name: new RegExp(t.reset) }))

    // Later filters never restrict options in earlier dropdowns.
    choose('awd', 'without')
    expect(options('group')).toEqual(['all', 'bau', 'oneMha'])
    expect(options('season')).toEqual(['all', 'sustainable', 'threeSeasons', 'twoSeasons'])
    expect(options('resource')).toEqual(['all', 'normal', 'neutral', 'shortage'])
    choose('group', 'oneMha')
    expect(select('awd')).toHaveValue('all')
    expect(options('season')).toEqual(['all', 'twoSeasons'])
    expect(options('awd')).toEqual(['all', 'with'])
    expect(options('resource')).toEqual(['all', 'normal', 'shortage'])
    expect(options('group')).toEqual(['all', 'bau', 'oneMha'])
    expect(screen.getAllByRole('article')).toHaveLength(4)

    choose('climate', 'mild')
    choose('resource', 'shortage')
    expect(screen.getAllByRole('article')).toHaveLength(1)
    // Only preceding selections constrain the available alternatives.
    expect(options('climate')).toEqual(['all', 'mild', 'severe'])
    choose('climate', 'severe')
    expect(select('resource')).toHaveValue('all')
    expect(screen.getAllByRole('article')).toHaveLength(2)
    choose('resource', 'normal')
    expect(screen.getAllByRole('article')).toHaveLength(1)
    expect(select('group')).toHaveValue('oneMha')

    const otherLanguage = language === 'vi' ? 'en' : 'vi'
    rerender(page(otherLanguage))
    expect(screen.getByRole('combobox', { name: economicsText[otherLanguage].group })).toHaveValue('oneMha')
    expect(within(screen.getByRole('combobox', { name: economicsText[otherLanguage].season })).getAllByRole('option')).toHaveLength(2)
    rerender(page(language))
    reset()
    expect(options('season')).toEqual(['all', 'sustainable', 'threeSeasons', 'twoSeasons'])
    expect(options('resource')).toEqual(['all', 'normal', 'neutral', 'shortage'])
    expect(screen.getAllByRole('article')).toHaveLength(17)

    // Changing the first dropdown clears all later selections, including valid ones.
    choose('group', 'bau')
    choose('season', 'threeSeasons')
    choose('climate', 'mild')
    choose('resource', 'neutral')
    choose('awd', 'without')
    expect(screen.getAllByRole('article')).toHaveLength(1)
    choose('group', 'oneMha')
    expect(select('season')).toHaveValue('all')
    expect(select('resource')).toHaveValue('all')
    expect(select('awd')).toHaveValue('all')
    expect(select('climate')).toHaveValue('all')
    expect(screen.getAllByRole('article')).toHaveLength(4)
    reset()

    choose('resource', 'neutral')
    expect(options('group')).toEqual(['all', 'bau', 'oneMha'])
    expect(options('season')).toEqual(['all', 'sustainable', 'threeSeasons', 'twoSeasons'])
    expect(options('climate')).toEqual(['all', 'mild', 'severe'])
    expect(options('awd')).toEqual(['all', 'without'])
    choose('climate', 'severe')
    expect(select('resource')).toHaveValue('all')
    expect(screen.getAllByRole('article')).toHaveLength(8)
    reset()

    // A downstream AWD choice leaves the scenario group and season unchanged.
    choose('season', 'twoSeasons')
    choose('awd', 'with')
    expect(options('group')).toEqual(['all', 'bau', 'oneMha'])
    expect(screen.getAllByRole('article')).toHaveLength(4)
    choose('group', 'bau')
    expect(select('season')).toHaveValue('all')
    expect(select('awd')).toHaveValue('all')
    expect(screen.getAllByRole('article')).toHaveLength(13)

    choose('season', 'threeSeasons')
    choose('climate', 'mild')
    choose('resource', 'normal')
    choose('awd', 'without')
    choose('resource', 'shortage')
    expect(select('group')).toHaveValue('bau')
    expect(select('season')).toHaveValue('threeSeasons')
    expect(select('climate')).toHaveValue('mild')
    expect(select('awd')).toHaveValue('all')
    choose('awd', 'without')
    choose('season', 'twoSeasons')
    expect(select('group')).toHaveValue('bau')
    expect(select('climate')).toHaveValue('all')
    expect(select('resource')).toHaveValue('all')
    expect(select('awd')).toHaveValue('all')
    choose('climate', 'severe')
    choose('resource', 'normal')
    choose('awd', 'without')
    choose('season', 'all')
    expect(select('climate')).toHaveValue('all')
    expect(select('resource')).toHaveValue('all')
    expect(select('awd')).toHaveValue('all')
  })
})
