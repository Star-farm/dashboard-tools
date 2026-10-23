import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import App from '../src/app/App'
import HeaderNavigation from '../src/app/HeaderNavigation'
import Bau2FarmingPage from '../src/features/economics/Bau2FarmingPage'
import BauSustainableFarmingPage from '../src/features/economics/BauSustainableFarmingPage'
import OneMhaFarmingPage from '../src/features/economics/OneMhaFarmingPage'
import { analyzeBauFarming, bauFarmingStats, bauFarmingSummary } from '../src/features/economics/bauFarmingAnalysis'
import { bau3Domain } from '../src/features/economics/bau3Analysis'
import { bau3Metrics } from '../src/features/economics/bau3Types'
import type { Bau3Data, Bau3Family, Bau3Metric } from '../src/features/economics/bau3Types'
import two from '../src/data/economics-bau2-series.json'
import sustainable from '../src/data/economics-bauss-series.json'
import three from '../src/data/economics-bau3-series.json'
import { parseCsv } from '../src/utils/csv'

const models = [
  { family: 'bau2s' as Bau3Family, data: two as Bau3Data, Component: Bau2FarmingPage, title: 'Canh tác như thường lệ · 2 mùa vụ', enTitle: 'Business as usual · 2 seasons', metadata: 'Canh tác thường lệ · 2 mùa vụ | STAR FARM', name: 'canh tác thường lệ 2 vụ', enName: 'business as usual with two seasons', hash: '#economics-bau2', page: 'bau2Farming' as const, leaf: '2 mùa vụ', season: '2 Seasons', viSeason: '2 vụ', count: 3840 },
  { family: 'bauss' as Bau3Family, data: sustainable as Bau3Data, Component: BauSustainableFarmingPage, title: 'Canh tác như thường lệ · Bền vững', enTitle: 'Business as usual · Sustainable', metadata: 'Canh tác thường lệ · Bền vững | STAR FARM', name: 'canh tác thường lệ bền vững', enName: 'sustainable business-as-usual farming', hash: '#economics-bauss', page: 'baussFarming' as const, leaf: 'Bền vững', season: 'Sustainable', viSeason: 'Bền vững', count: 5616 },
  { family: 'oneMha' as Bau3Family, data: three as Bau3Data, Component: OneMhaFarmingPage, title: 'Một triệu héc ta lúa', enTitle: 'One million hectares of rice', metadata: 'Một triệu héc ta lúa | STAR FARM', name: 'mô hình 1Mha', enName: 'the 1Mha system', hash: '#economics-1mha', page: 'oneMhaFarming' as const, leaf: 'Một triệu hecta lúa', season: '', viSeason: '', count: 3840 },
]

describe.each(models)('$family standalone farming page', (model) => {
  it.each(['USD', 'VND'] as const)('matches raw %s records for the selected model and endpoint changes', (currency) => {
    const filename = currency === 'USD' ? 'STAR_FARM CSV - Master file.csv' : 'STAR_FARM CSV - Dữ liệu tổng.csv'
    const [header, ...rows] = parseCsv(readFileSync(resolve('src/data', filename), 'utf8'))
    const cell = (row: string[], column: string) => row[header.indexOf(column)]
    const group = model.family === 'oneMha' ? '1Mha' : currency === 'USD' ? 'Business As Usual' : 'Thường lệ'
    const season = currency === 'USD' ? model.season : model.viSeason
    const selected = rows.filter((row) => {
      const year = Number(cell(row, 'datetime').slice(0, 4))
      return year >= 2027 && year <= 2050 && cell(row, 'Scenario Group') === group && (!season || cell(row, 'Season Type') === season)
    })
    expect(selected).toHaveLength(model.count)
    const columns: Record<Bau3Metric, string> = { income: 'Net Income', cost: 'Production Cost', yield: 'Avg Yield', margin: 'Profit Margin', labor: 'Labor Intensity' }
    for (const metric of bau3Metrics) {
      const mean = (records: string[][]) => records.reduce((sum, row) => sum + Number(cell(row, columns[metric])), 0) / records.length
      const start = mean(selected.filter((row) => cell(row, 'datetime').startsWith('2027')))
      const end = mean(selected.filter((row) => cell(row, 'datetime').startsWith('2050')))
      const stats = bauFarmingStats(model.data, metric, currency, model.family)
      expect(stats.mean).toBeCloseTo(mean(selected), 5)
      expect(stats.start).toBeCloseTo(start, 5)
      expect(stats.end).toBeCloseTo(end, 5)
      expect(stats.change).toBeCloseTo(metric === 'margin' ? end - start : (end - start) / Math.abs(start) * 100, 5)
    }
  })

  it('keeps the selected model isolated and uses its own name and findings', () => {
    const summary = bauFarmingSummary(model.data, 'vi', model.family)
    expect(summary).toContain(model.name)
    expect(summary).not.toContain('3 vụ')
    expect(bauFarmingSummary(model.data, 'en', model.family)).toContain(model.enName)
    expect(analyzeBauFarming(model.data, 'income', 'en', model.family)!.paragraph).not.toContain('three-season')
    const changed = structuredClone(model.data)
    for (const series of changed.series.filter((series) => series.family !== model.family)) for (const point of series.USD) point.income = 1e9
    expect(bauFarmingStats(changed, 'income', 'USD', model.family)).toEqual(bauFarmingStats(model.data, 'income', 'USD', model.family))
    const selected = { ...model.data, series: model.data.series.filter((series) => series.family === model.family) }
    const domain = bau3Domain(selected, 'labor', 'USD')
    expect(domain[0]).toBeGreaterThan(0)
    for (const series of selected.series) for (const point of series.USD) {
      expect(point.labor).toBeGreaterThanOrEqual(domain[0])
      expect(point.labor).toBeLessThanOrEqual(domain[1])
    }
  })

  it('renders the shared KPI and chart template, the selected data and both languages', () => {
    const { container, rerender } = render(<model.Component language="vi" />)
    expect(screen.getByRole('heading', { level: 1, name: model.title })).toBeInTheDocument()
    expect(within(screen.getByRole('region', { name: 'Các chỉ số kinh tế' })).getAllByRole('term')).toHaveLength(5)
    expect(screen.getAllByRole('article')).toHaveLength(5)
    expect(container.querySelectorAll(`.bau3-chart-${model.family}`)).toHaveLength(5)
    expect(screen.getByRole('complementary', { name: 'Nhận xét tổng hợp' })).toHaveTextContent(model.name)
    for (const chart of screen.getAllByRole('article')) {
      expect(chart.querySelectorAll('circle.recharts-line-dot')).toHaveLength(96)
      const paths = [...chart.querySelectorAll('path.recharts-line-curve')]
      expect(paths.map((path) => path.getAttribute('stroke'))).toEqual(['#3478c6', '#9362bc', '#ce762b', '#589044'])
      for (const path of paths) expect(path.getAttribute('d')).not.toMatch(/[CQ]/)
      expect(chart.nextElementSibling!.querySelectorAll('p')).toHaveLength(1)
      expect(chart.nextElementSibling!.querySelectorAll('strong').length).toBeGreaterThan(3)
    }
    rerender(<model.Component language="en" />)
    expect(screen.getByRole('heading', { level: 1, name: model.enTitle })).toBeInTheDocument()
    const indicators = screen.getByRole('region', { name: 'Economic indicators' })
    expect(indicators).toHaveTextContent('$/ha')
    expect(indicators).toHaveTextContent('2050 compared with 2027')
    expect(screen.getByRole('complementary', { name: 'Overall assessment' })).toHaveTextContent(model.enName)
  }, 10000)

  it.each([false, true])('opens from the menu (mobile: %s)', (mobile) => {
    const navigate = vi.fn()
    render(<HeaderNavigation language="vi" page={model.page} mobile={mobile} onNavigate={navigate} />)
    fireEvent.click(screen.getByRole('button', { name: 'Kinh tế' }))
    if (model.family !== 'oneMha') fireEvent.click(screen.getByRole('button', { name: 'Canh tác như thường lệ' }))
    const link = screen.getByRole('link', { name: model.leaf })
    expect(link).toHaveAttribute('href', model.hash)
    expect(link).toHaveAttribute('aria-current', 'page')
    fireEvent.click(link)
    expect(navigate).toHaveBeenCalledOnce()
    expect(screen.getByRole('button', { name: 'Kinh tế' })).toHaveAttribute('aria-expanded', 'false')
  })

  it('supports direct URLs and translated page metadata', async () => {
    window.history.replaceState(null, '', model.hash)
    render(<App />)
    expect(await screen.findByRole('heading', { level: 1, name: model.title })).toBeInTheDocument()
    expect(document.title).toBe(model.metadata)
    fireEvent.click(screen.getByRole('button', { name: 'English' }))
    expect(document.title).toBe(`${model.enTitle} | STAR FARM`)
    expect(window.location.hash).toBe(model.hash)
  }, 10000)
})
