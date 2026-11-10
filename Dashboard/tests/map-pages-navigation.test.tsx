import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import HeaderNavigation from '../src/app/HeaderNavigation'
import App from '../src/app/App'

vi.mock('../src/features/map/SoilMapSection', () => ({ default: () => <section aria-label="Soil overlay">Soil map content</section> }))
afterEach(() => vi.unstubAllGlobals())

describe('map destinations', () => {
  it('uses a topic landing link and supports desktop keyboard navigation into both maps', async () => {
    render(<HeaderNavigation language="en" page="soilMap" />)
    expect(screen.getByRole('link', { name: 'Map', current: 'location' })).toHaveAttribute('href', '#map-explore')
    const trigger = screen.getByRole('button', { name: 'Map' })
    fireEvent.keyDown(trigger, { key: 'ArrowDown' })
    const farming = screen.getByRole('link', { name: 'Farming area map' })
    await waitFor(() => expect(farming).toHaveFocus())
    expect(farming).toHaveAttribute('href', '#map')
    fireEvent.keyDown(farming, { key: 'ArrowDown' })
    const soil = screen.getByRole('link', { name: 'Soil and flooding map', current: 'page' })
    expect(soil).toHaveFocus()
    expect(soil).toHaveAttribute('href', '#soil-map')
    fireEvent.keyDown(soil, { key: 'Escape' })
    expect(trigger).toHaveFocus()
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
  })

  it('provides the same two destinations on mobile and closes after navigation', () => {
    const navigate = vi.fn()
    const { rerender } = render(<HeaderNavigation language="vi" page="map" mobile onNavigate={navigate} />)
    fireEvent.click(screen.getByRole('button', { name: 'Bản đồ' }))
    expect(screen.getByRole('link', { name: 'Bản đồ vùng canh tác', current: 'page' })).toHaveAttribute('href', '#map')
    rerender(<HeaderNavigation language="en" page="map" mobile onNavigate={navigate} />)
    const soilLink = screen.getByRole('link', { name: 'Soil and flooding map' })
    soilLink.addEventListener('click', (event) => event.preventDefault(), { once: true })
    fireEvent.click(soilLink)
    expect(navigate).toHaveBeenCalledOnce()
    expect(screen.getByRole('button', { name: 'Map' })).toHaveAttribute('aria-expanded', 'false')
  })

  it('routes to the coordinating page and separate soil page with breadcrumbs and metadata', async () => {
    window.history.replaceState(null, '', '#map-explore')
    const fetcher = vi.fn(async () => ({ ok: true, json: async () => ({ plots: [] }) }))
    vi.stubGlobal('fetch', fetcher)
    render(<App />)
    expect(await screen.findByRole('heading', { level: 1, name: 'Bản đồ' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Bản đồ vùng canh tác' })).toHaveAttribute('href', '#map')
    expect(screen.getByRole('link', { name: 'Bản đồ đất và ngập' })).toHaveAttribute('href', '#soil-map')
    expect(fetcher).not.toHaveBeenCalled()
    act(() => { window.location.hash = '#soil-map'; window.dispatchEvent(new HashChangeEvent('hashchange')) })
    expect(await screen.findByRole('heading', { level: 1, name: 'Bản đồ đất và ngập' })).toBeInTheDocument()
    expect(await screen.findByRole('region', { name: 'Soil overlay' })).toBeInTheDocument()
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
    const breadcrumbs = screen.getByRole('navigation', { name: 'Đường dẫn trang' })
    expect(within(breadcrumbs).getByRole('link', { name: 'Bản đồ' })).toHaveAttribute('href', '#map-explore')
    expect(document.title).toBe('Bản đồ đất và ngập | STAR FARM')
    fireEvent.click(screen.getByRole('button', { name: 'English' }))
    expect(screen.getByRole('heading', { level: 1, name: 'Soil and flooding map' })).toBeInTheDocument()
    expect(document.title).toBe('Soil and flooding map | STAR FARM')
  })
})
