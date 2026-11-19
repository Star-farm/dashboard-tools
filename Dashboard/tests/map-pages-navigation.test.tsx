import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import HeaderNavigation from '../src/app/HeaderNavigation'
import App from '../src/app/App'

vi.mock('../src/features/map/SoilMapSection', () => ({ default: () => <section aria-label="Soil overlay">Soil map content</section> }))
vi.mock('../src/features/map/MapPage', () => ({ default: () => <h1>Farming map page</h1> }))
afterEach(() => vi.unstubAllGlobals())

describe('map destinations', () => {
  it('links directly to the farming map and supports desktop keyboard navigation into both maps', async () => {
    render(<HeaderNavigation language="en" page="soilMap" />)
    const trigger = screen.getByRole('button', { name: 'Map' })
    expect(trigger).toHaveAttribute('aria-current', 'location')
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
    const currentHash = window.location.hash
    fireEvent.click(screen.getByRole('button', { name: 'Bản đồ' }))
    expect(window.location.hash).toBe(currentHash)
    expect(screen.getByRole('link', { name: 'Bản đồ vùng canh tác', current: 'page' })).toHaveAttribute('href', '#map')
    rerender(<HeaderNavigation language="en" page="map" mobile onNavigate={navigate} />)
    const soilLink = screen.getByRole('link', { name: 'Soil and flooding map' })
    soilLink.addEventListener('click', (event) => event.preventDefault(), { once: true })
    fireEvent.click(soilLink)
    expect(navigate).toHaveBeenCalledOnce()
    expect(screen.getByRole('button', { name: 'Map' })).toHaveAttribute('aria-expanded', 'false')
  })

  it('routes legacy map landing links to the farming map and keeps the soil map separate', async () => {
    window.history.replaceState(null, '', '#map-explore')
    const fetcher = vi.fn(async () => ({ ok: true, json: async () => ({ plots: [] }) }))
    vi.stubGlobal('fetch', fetcher)
    render(<App />)
    expect(await screen.findByRole('heading', { level: 1, name: 'Farming map page' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Bản đồ' }))
    expect(screen.getByRole('link', { name: 'Bản đồ vùng canh tác', current: 'page' })).toHaveAttribute('href', '#map')
    expect(screen.getByRole('link', { name: 'Bản đồ đất và ngập' })).toHaveAttribute('href', '#soil-map')
    act(() => { window.location.hash = '#soil-map'; window.dispatchEvent(new HashChangeEvent('hashchange')) })
    expect(await screen.findByRole('heading', { level: 1, name: 'Bản đồ đất và ngập' })).toBeInTheDocument()
    expect(await screen.findByRole('region', { name: 'Soil overlay' })).toBeInTheDocument()
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: 'Breadcrumb' })).not.toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: 'Đường dẫn trang' })).not.toBeInTheDocument()
    expect(document.title).toBe('Bản đồ đất và ngập | STAR FARM')
    fireEvent.click(screen.getByRole('button', { name: 'English' }))
    expect(screen.getByRole('heading', { level: 1, name: 'Soil and flooding map' })).toBeInTheDocument()
    expect(document.title).toBe('Soil and flooding map | STAR FARM')
  })
})
