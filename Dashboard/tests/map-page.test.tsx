import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import App from '../src/app/App'
import type { MapGeometry } from '../src/features/map/mapTypes'

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  LineChart: () => <div data-testid="map-trend" />,
  Line: () => null, CartesianGrid: () => null, ReferenceLine: () => null,
  Tooltip: () => null, XAxis: () => null, YAxis: () => null,
}))
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals() })

describe('routed map experience', () => {
  it('uses Dashboard filters, removes area lookup, and plays, pauses and restarts the timeline', async () => {
    const requested: string[] = []
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      const filename = url.split('/').at(-1)!
      requested.push(filename)
      const data = JSON.parse(readFileSync(resolve('public/map-data', filename), 'utf8'))
      if (filename === 'geometry.json') (data as MapGeometry).plots = (data as MapGeometry).plots.slice(0, 2)
      return { ok: true, json: async () => data }
    }))
    window.history.replaceState(null, '', '#map')
    vi.spyOn(navigator, 'languages', 'get').mockReturnValue(['en-US'])
    render(<App />)
    expect(await screen.findByRole('heading', { level: 1, name: 'Farming area map' })).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByText('Loading map data…')).not.toBeInTheDocument())
    expect(screen.getByRole('link', { name: 'Map', current: 'location' })).toHaveAttribute('href', '#map-explore')
    expect(screen.queryByRole('heading', { name: 'Soil and flooding information' })).not.toBeInTheDocument()
    expect(requested).toHaveLength(4)
    expect(requested.filter((file) => file.startsWith('aggregate-'))).toHaveLength(1)
    expect(screen.queryByLabelText('Select area')).not.toBeInTheDocument()
    expect(screen.queryByText('Area lookup')).not.toBeInTheDocument()
    expect(screen.queryByText('Sources and spatial linkage')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Scenario group')).toHaveValue('all')
    expect(within(screen.getByLabelText('Scenario group')).getAllByRole('option').map((option) => option.textContent)).toEqual(['All', 'Business as usual', '1Mha'])
    expect(within(screen.getByLabelText('Season type')).getAllByRole('option').map((option) => option.textContent)).toEqual(['All', 'Sustainable', '3 seasons', '2 seasons'])
    expect(within(screen.getByLabelText('Harvest')).getAllByRole('option').map((option) => option.textContent)).toEqual(['Mean across harvests', 'Winter–Spring', 'Spring–Summer', 'Fall–Winter'])
    expect(document.querySelectorAll('#map-year-stops option')).toHaveLength(24)
    expect(document.querySelectorAll('.map-year-labels > span')).toHaveLength(5)
    expect(document.querySelector('.map-year-labels')).toHaveTextContent('2027')
    expect(document.querySelector('.map-year-labels')).toHaveTextContent('2050')
    expect(within(screen.getByRole('group', { name: 'Map layer' })).queryByRole('button', { name: 'Salinity vulnerability' })).not.toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Harvest'), { target: { value: '3' } })
    expect(screen.getByLabelText('Harvest')).toHaveValue('3')
    fireEvent.change(screen.getByLabelText('Scenario group'), { target: { value: 'oneMha' } })
    expect(screen.getByLabelText('Harvest')).toHaveValue('0')
    expect(within(screen.getByLabelText('Harvest')).queryByRole('option', { name: 'Fall–Winter' })).not.toBeInTheDocument()
    expect(within(screen.getByLabelText('Season type')).getAllByRole('option').map((option) => option.textContent)).toEqual(['All', '2 seasons'])
    fireEvent.change(screen.getByLabelText('Scenario group'), { target: { value: 'bau' } })
    fireEvent.change(screen.getByLabelText('Season type'), { target: { value: 'threeSeasons' } })
    fireEvent.change(screen.getByLabelText('Weather'), { target: { value: 'mild' } })
    fireEvent.change(screen.getByLabelText('Resource scenario'), { target: { value: 'normal' } })
    expect(await screen.findByText('6.96', { selector: '.map-summary strong' })).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Harvest'), { target: { value: '1' } })
    const source = JSON.parse(readFileSync(resolve('public/map-data/bau3-mild-normal.json'), 'utf8'))
    const harvest = source.records.find((record: { year: number; season: number }) => record.year === 2027 && record.season === 1)
    const expectedMean = harvest.yield.reduce((sum: number, value: number) => sum + value, 0) / harvest.yield.length
    const expectedIncome = harvest.income.reduce((sum: number, value: number) => sum + value, 0) / harvest.income.length
    expect(screen.getByText(new Intl.NumberFormat('en', { maximumFractionDigits: 2 }).format(expectedMean), { selector: '.map-summary strong' })).toBeInTheDocument()
    vi.useFakeTimers()
    fireEvent.click(screen.getByRole('button', { name: 'Play timeline' }))
    act(() => vi.advanceTimersByTime(2000))
    expect(screen.getByRole('slider')).toHaveValue('2029')
    expect(screen.getByLabelText('Harvest')).toHaveValue('1')
    fireEvent.click(screen.getByRole('button', { name: 'Pause' }))
    act(() => vi.advanceTimersByTime(2000))
    expect(screen.getByRole('slider')).toHaveValue('2029')
    fireEvent.change(screen.getByRole('slider'), { target: { value: '2049' } })
    fireEvent.click(screen.getByRole('button', { name: 'Play timeline' }))
    act(() => vi.advanceTimersByTime(1000))
    expect(screen.getByRole('slider')).toHaveValue('2050')
    expect(screen.getByRole('button', { name: 'Play timeline' })).toHaveAttribute('aria-pressed', 'false')
    fireEvent.click(screen.getByRole('button', { name: 'Play timeline' }))
    expect(screen.getByRole('slider')).toHaveValue('2027')
    fireEvent.change(screen.getByLabelText('Weather'), { target: { value: 'severe' } })
    expect(screen.getByRole('button', { name: 'Play timeline' })).toHaveAttribute('aria-pressed', 'false')
    vi.useRealTimers()
    const destination = new URLSearchParams(screen.getByRole('link', { name: 'View resources' }).getAttribute('href')!.split('?')[1])
    expect(destination.get('group')).toBe('bau')
    expect(destination.get('season')).toBe('threeSeasons')
    expect(destination.get('climate')).toBe('severe')
    expect(destination.get('harvest')).toBe('1')
    expect(destination.get('year')).toBe('2027')
    fireEvent.change(screen.getByLabelText('Weather'), { target: { value: 'mild' } })
    fireEvent.change(screen.getByLabelText('Resource scenario'), { target: { value: 'normal' } })
    fireEvent.change(screen.getByLabelText('Harvest'), { target: { value: '1' } })
    fireEvent.click(screen.getByRole('button', { name: 'Tiếng Việt' }))
    expect(screen.getByRole('heading', { level: 1, name: 'Bản đồ vùng canh tác' })).toBeInTheDocument()
    expect(screen.getByLabelText('Nhóm kịch bản')).toHaveValue('bau')
    expect(within(screen.getByLabelText('Vụ thu hoạch')).getAllByRole('option').map((option) => option.textContent)).toEqual(['Trung bình các vụ', 'Đông Xuân', 'Xuân Hè', 'Thu Đông'])
    expect(screen.getByText('VNĐ/ha', { selector: '.map-summary small' })).toBeInTheDocument()
    expect(screen.getByText(new Intl.NumberFormat('vi', { maximumFractionDigits: 0 }).format(expectedIncome * 26322), { selector: '.map-summary strong' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Vùng 0' }))
    const popup = screen.getByRole('dialog', { name: 'Vùng 0' })
    expect(within(popup).getByText('VNĐ/ha')).toBeInTheDocument()
    expect(within(popup).getByText(new Intl.NumberFormat('vi', { maximumFractionDigits: 0 }).format(harvest.income[0] * 26322))).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'English' }))
    expect(within(popup).getByText('USD/ha')).toBeInTheDocument()
    expect(within(popup).getByText(new Intl.NumberFormat('en', { maximumFractionDigits: 2 }).format(harvest.income[0]))).toBeInTheDocument()
  })
})
