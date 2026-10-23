import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import App from '../src/app/App'
import HeaderNavigation from '../src/app/HeaderNavigation'
import Bau3FarmingPage from '../src/features/economics/Bau3FarmingPage'
import { analyzeBauFarming, bauFarmingStats, bauFarmingSummary, farmingTone } from '../src/features/economics/bauFarmingAnalysis'
import { bau3Metrics } from '../src/features/economics/bau3Types'
import type { Bau3Data, Bau3Metric } from '../src/features/economics/bau3Types'
import cached from '../src/data/economics-bau3-series.json'
import { parseCsv } from '../src/utils/csv'

const data = cached as Bau3Data

describe('three-season business-as-usual KPIs', () => {
  it.each([
    { file: 'STAR_FARM CSV - Master file.csv', currency: 'USD', group: 'Business As Usual', season: '3 Seasons' },
    { file: 'STAR_FARM CSV - Dữ liệu tổng.csv', currency: 'VND', group: 'Thường lệ', season: '3 vụ' },
  ] as const)('matches independently selected raw records in $currency, including start and end years', ({ file, currency, group, season }) => {
    const [header, ...rows] = parseCsv(readFileSync(resolve('src/data', file), 'utf8'))
    const cell = (row: string[], name: string) => row[header.indexOf(name)]
    const selected = rows.filter((row) => cell(row, 'Scenario Group') === group && cell(row, 'Season Type') === season && Number(cell(row, 'datetime').slice(0, 4)) >= 2027 && Number(cell(row, 'datetime').slice(0, 4)) <= 2050)
    expect(selected).toHaveLength(5688)
    const columns: Record<Bau3Metric, string> = { income: 'Net Income', cost: 'Production Cost', yield: 'Avg Yield', margin: 'Profit Margin', labor: 'Labor Intensity' }
    for (const metric of bau3Metrics) {
      const mean = (records: string[][]) => records.reduce((sum, row) => sum + Number(cell(row, columns[metric])), 0) / records.length
      const stats = bauFarmingStats(data, metric, currency)
      const start = mean(selected.filter((row) => cell(row, 'datetime').startsWith('2027')))
      const end = mean(selected.filter((row) => cell(row, 'datetime').startsWith('2050')))
      expect(stats.mean).toBeCloseTo(mean(selected), 5)
      expect(stats.start).toBeCloseTo(start, 5)
      expect(stats.end).toBeCloseTo(end, 5)
      expect(stats.change).toBeCloseTo(metric === 'margin' ? end - start : (end - start) / Math.abs(start) * 100, 5)
    }
  })

  it('uses percentage points for margins and treats reduced labor cautiously', () => {
    const margin = bauFarmingStats(data, 'margin', 'USD')
    expect(margin.change).toBeLessThan(0)
    expect(farmingTone(margin)).toBe('bad')
    expect(farmingTone(bauFarmingStats(data, 'cost', 'USD'))).toBe('bad')
    expect(farmingTone(bauFarmingStats(data, 'labor', 'USD'))).toBe('neutral')
    expect(analyzeBauFarming(data, 'margin', 'vi')!.paragraph).toContain('điểm phần trăm')
    expect(analyzeBauFarming(data, 'income', 'vi')!.paragraph).toContain('giảm ở 4/4 tổ hợp')
    expect(analyzeBauFarming(data, 'labor', 'vi')!.paragraph).toContain('không tự động đồng nghĩa với hiệu quả cao hơn')
    expect(bauFarmingSummary(data, 'vi')).toContain('Các tổ hợp thiếu tài nguyên')
  })

  it('keeps zeroes and negatives, avoids dividing by zero and handles missing data', () => {
    const changed = structuredClone(data)
    for (const series of changed.series.filter((series) => series.family === 'bau3s')) {
      for (const point of series.USD) point.income = point.year === 2027 ? 0 : -10
    }
    expect(bauFarmingStats(changed, 'income', 'USD')).toMatchObject({ start: 0, end: -10, change: null })
    expect(analyzeBauFarming(changed, 'income', 'en')!.paragraph).toContain('Declining income')
    expect(analyzeBauFarming(changed, 'income', 'en')!.paragraph).not.toMatch(/NaN|Infinity/)
    const empty = { ...data, series: [] }
    expect(bauFarmingStats(empty, 'yield', 'USD')).toMatchObject({ mean: null, start: null, end: null, change: null })
    expect(analyzeBauFarming(empty, 'yield', 'en')).toBeNull()
    expect(bauFarmingSummary(empty, 'en')).not.toMatch(/NaN|Infinity/)
  })
})

describe('three-season business-as-usual page', () => {
  it('shows five KPIs, an overall assessment before five charts and individual paragraphs below each chart', () => {
    const { container, rerender } = render(<Bau3FarmingPage language="vi" />)
    expect(screen.getByRole('heading', { level: 1, name: 'Canh tác như thường lệ · 3 mùa vụ' })).toBeInTheDocument()
    const indicators = screen.getByRole('region', { name: 'Các chỉ số kinh tế' })
    expect(within(indicators).getAllByRole('term')).toHaveLength(5)
    expect(indicators).toHaveTextContent('Năm 2050 so với 2027')
    expect(indicators).toHaveTextContent('điểm %')
    expect(indicators).toHaveTextContent('VNĐ/ha')
    const summary = screen.getByRole('complementary', { name: 'Nhận xét tổng hợp' })
    expect(summary.querySelectorAll('p')).toHaveLength(1)
    expect(summary.querySelectorAll('strong').length).toBeGreaterThan(5)
    expect(summary.compareDocumentPosition(screen.getAllByRole('article')[0]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(screen.getAllByRole('article')).toHaveLength(5)
    expect(screen.getAllByRole('complementary')).toHaveLength(6)
    for (const card of screen.getAllByRole('article')) {
      expect(card.querySelectorAll('path.recharts-line-curve')).toHaveLength(4)
      expect(card.querySelectorAll('circle.recharts-line-dot')).toHaveLength(96)
      const insight = card.nextElementSibling!
      expect(insight).toHaveAttribute('class', 'bau3-insight farming-chart-insight')
      expect(insight.querySelectorAll('p')).toHaveLength(1)
      expect(insight.querySelectorAll('strong').length).toBeGreaterThan(3)
    }
    expect(container.querySelectorAll('.bau3-chart-oneMha')).toHaveLength(0)
    rerender(<Bau3FarmingPage language="en" />)
    expect(screen.getByRole('heading', { level: 1, name: 'Business as usual · 3 seasons' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Economic indicators' })).toHaveTextContent('$/ha')
    expect(screen.getByRole('complementary', { name: 'Overall assessment' })).toHaveTextContent('percentage points')
  })

  it.each([false, true])('connects the three-season leaf to its page (mobile: %s)', (mobile) => {
    const navigate = vi.fn()
    render(<HeaderNavigation language="vi" page="bau3Farming" mobile={mobile} onNavigate={navigate} />)
    fireEvent.click(screen.getByRole('button', { name: 'Kinh tế' }))
    fireEvent.click(screen.getByRole('button', { name: 'Canh tác như thường lệ' }))
    const link = screen.getByRole('link', { name: '3 mùa vụ' })
    expect(link).toHaveAttribute('href', '#economics-bau3')
    expect(link).toHaveAttribute('aria-current', 'page')
    fireEvent.click(link)
    expect(navigate).toHaveBeenCalledOnce()
    expect(screen.getByRole('button', { name: 'Kinh tế' })).toHaveAttribute('aria-expanded', 'false')
  })

  it('opens by direct URL and translates the page metadata', async () => {
    window.history.replaceState(null, '', '#economics-bau3')
    render(<App />)
    expect(await screen.findByRole('heading', { level: 1, name: 'Canh tác như thường lệ · 3 mùa vụ' })).toBeInTheDocument()
    expect(document.title).toBe('Canh tác thường lệ · 3 mùa vụ | STAR FARM')
    fireEvent.click(screen.getByRole('button', { name: 'English' }))
    expect(document.title).toBe('Business as usual · 3 seasons | STAR FARM')
  })
})
