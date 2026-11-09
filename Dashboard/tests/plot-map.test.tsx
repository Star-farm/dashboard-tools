import { afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import PlotMap from '../src/features/map/PlotMap'
import { zoomViewport } from '../src/features/map/mapViewport'
import type { MapGeometry } from '../src/features/map/mapTypes'

const geometry: MapGeometry = {
  width: 1000, height: 530, metersPerUnit: 173, crs: 'EPSG:32648', bounds: [], sourceSha256: '',
  plots: [{ id: 0, record: 1, areaHa: 52.5, path: 'M0,0L100,0L100,100L0,100Z', center: [50, 50] }],
  raster: { columns: 0, rows: 0, values: [], x: 0, y: 0, cellWidth: 0, cellHeight: 0, resolutionMeters: [] },
}
const props = { geometry, values: [6.5], yieldValues: [6.5], incomeValues: [-10], metric: 'yield' as const, breaks: [0, 2, 4, 6, 8, 10], language: 'en' as const, periodLabel: '2035 · Winter–Spring', scenarioLabel: 'BAU-3V-OH-BT' }
afterEach(() => vi.unstubAllGlobals())

describe('interactive plot map', () => {
  it('zooms around the cursor, clamps bounds, and prevents page scrolling inside the map', () => {
    expect(zoomViewport({ zoom: 1, x: 500, y: 250 }, 2, { x: 300, y: 100 })).toEqual({ zoom: 2, x: 400, y: 175 })
    expect(zoomViewport({ zoom: 12, x: 1, y: 2 }, 100).zoom).toBe(12)
    expect(zoomViewport({ zoom: 1, x: 1, y: 2 }, .01).zoom).toBe(1)
    const { container } = render(<PlotMap {...props} />)
    const svg = container.querySelector('.plot-map-svg')!
    const initial = svg.getAttribute('viewBox')
    const wheel = new WheelEvent('wheel', { deltaY: -120, bubbles: true, cancelable: true })
    fireEvent(svg, wheel)
    expect(wheel.defaultPrevented).toBe(true)
    expect(Number(svg.getAttribute('viewBox')!.split(' ')[2])).toBeLessThan(Number(initial!.split(' ')[2]))
    fireEvent.click(screen.getByRole('button', { name: 'Fit map' }))
    expect(svg).toHaveAttribute('viewBox', initial)
    fireEvent.wheel(svg, { deltaY: 120 })
    expect(svg).toHaveAttribute('viewBox', initial)
  })

  it('opens a plot popup, updates values with the current time/filter and closes with Escape', () => {
    const { rerender } = render(<PlotMap {...props} />)
    fireEvent.click(screen.getByRole('button', { name: 'Area 0' }))
    const popup = screen.getByRole('dialog', { name: 'Area 0' })
    expect(within(popup).getByText('52.5')).toBeInTheDocument()
    expect(within(popup).getByText('6.5')).toBeInTheDocument()
    expect(within(popup).getByText('-10')).toBeInTheDocument()
    expect(within(popup).getByText('2035 · Winter–Spring')).toBeInTheDocument()
    expect(within(popup).getByText('BAU-3V-OH-BT')).toBeInTheDocument()
    rerender(<PlotMap {...props} yieldValues={[7]} incomeValues={[100]} periodLabel="2036 · Winter–Spring" />)
    expect(within(popup).getByText('7')).toBeInTheDocument()
    expect(within(popup).getByText('100')).toBeInTheDocument()
    expect(within(popup).getByText('2036 · Winter–Spring')).toBeInTheDocument()
    fireEvent.keyDown(screen.getByRole('button', { name: 'Close plot information' }), { key: 'Escape' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('distinguishes dragging from clicking a plot and supports pointer capture selection', () => {
    vi.stubGlobal('PointerEvent', MouseEvent)
    const { container } = render(<PlotMap {...props} />)
    const svg = container.querySelector('.plot-map-svg')!
    Object.assign(svg, { setPointerCapture: vi.fn(), hasPointerCapture: () => false })
    const plot = screen.getByRole('button', { name: 'Area 0' })
    fireEvent.pointerDown(plot, { button: 0, clientX: 50, clientY: 50 })
    fireEvent.pointerMove(svg, { clientX: 80, clientY: 80 })
    fireEvent.pointerUp(svg, { clientX: 80, clientY: 80 })
    fireEvent.click(plot, { detail: 1 })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    fireEvent.pointerDown(plot, { button: 0, clientX: 50, clientY: 50 })
    fireEvent.pointerUp(svg, { clientX: 50, clientY: 50 })
    expect(screen.getByRole('dialog', { name: 'Area 0' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Close plot information' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
