import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { mapDestination, mapContextRows, readMapContext } from '../src/app/mapNavigation'
import type { MapNavigationContext } from '../src/app/mapNavigation'
import App from '../src/app/App'

const context: MapNavigationContext = {
  filters: { group: 'bau', season: 'threeSeasons', climate: 'mild', resource: 'normal', awd: 'all' },
  year: 2035, harvest: 0, codes: ['BAU-3V-OH-BT'],
}

describe('map context navigation', () => {
  it('round-trips filters, crop and year and validates URL values', () => {
    expect(readMapContext(mapDestination('#economics-overview', context))).toEqual(context)
    expect(readMapContext('#economics-overview')).toBeUndefined()
    expect(readMapContext('#economics-overview?from=map&group=bad&year=3000&harvest=-3')?.filters.group).toBe('all')
    expect(readMapContext('#economics-overview?from=map&year=3000&harvest=-3')?.year).toBe(2027)
    const rows = [{ code: 'BAU-3V-OH-BT', historical: false }, { code: 'OTHER', historical: false }, { code: 'BAU-3V-OH-BT', historical: true }]
    expect(mapContextRows(rows, context)).toEqual([rows[0]])
    expect(mapContextRows(rows)).toHaveLength(3)
  })

  it.each([
    ['#economics-overview', 'Economic viability overview'],
    ['#resources-overview', 'Resource management overview'],
    ['#environment-overview', 'Environment overview'],
  ])('opens %s with the map filters and allows changing them', async (anchor, title) => {
    window.history.replaceState(null, '', mapDestination(anchor, context))
    vi.spyOn(navigator, 'languages', 'get').mockReturnValue(['en-US'])
    render(<App />)
    expect(await screen.findByRole('heading', { level: 1, name: title })).toBeInTheDocument()
    expect(screen.getByLabelText('Scenario group')).toHaveValue('bau')
    expect(screen.getByLabelText('Season type')).toHaveValue('threeSeasons')
    expect(screen.getByLabelText('Weather')).toHaveValue('mild')
    expect(screen.getByLabelText('Resource scenario')).toHaveValue('normal')
    expect(screen.getAllByRole('table')[0].querySelectorAll('tbody tr')).toHaveLength(1)
    expect(readMapContext(screen.getByRole('link', { name: /Back to map/ }).getAttribute('href')!)).toEqual(context)
    fireEvent.change(screen.getByLabelText('Scenario group'), { target: { value: 'oneMha' } })
    expect(screen.getByLabelText('Scenario group')).toHaveValue('oneMha')
    expect(screen.getByLabelText('Season type')).toHaveValue('all')
    expect(screen.getAllByRole('table')[0].querySelectorAll('tbody tr')).toHaveLength(4)
  })

  it.each(['#economics-overview', '#resources-overview', '#environment-overview'])('opens %s by crop with matching year and updates on same-page navigation', async (anchor) => {
    const selected = { ...context, harvest: 2 }
    window.history.replaceState(null, '', mapDestination(anchor, selected))
    vi.spyOn(navigator, 'languages', 'get').mockReturnValue(['en-US'])
    render(<App />)
    expect(await screen.findByRole('heading', { name: 'Seasonal analysis' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'By crop season' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByLabelText('Year')).toHaveValue('2035')
    expect(screen.getByLabelText('Crop season')).toHaveValue('middle')
    expect(screen.getByLabelText('Scenario group')).toHaveValue('bau')
    const table = screen.getAllByRole('table')[0]
    expect(within(table).getAllByRole('row')).toHaveLength(2)
    expect(within(table).getByRole('row', { name: /Spring–Summer/ })).toHaveTextContent('2035')
    window.history.replaceState(null, '', mapDestination(anchor, { ...selected, year: 2040, harvest: 1 }))
    fireEvent(window, new HashChangeEvent('hashchange'))
    await waitFor(() => expect(screen.getByLabelText('Year')).toHaveValue('2040'))
    expect(screen.getByLabelText('Crop season')).toHaveValue('early')
  })
})
