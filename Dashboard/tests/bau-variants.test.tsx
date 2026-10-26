import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import App from '../src/app/App'
import Bau2ComparisonPage from '../src/features/economics/Bau2ComparisonPage'
import BauSustainableComparisonPage from '../src/features/economics/BauSustainableComparisonPage'
import { aggregateBauComparisonData } from '../src/features/economics/aggregateBau3'
import { analyzeBau3 } from '../src/features/economics/bau3Analysis'
import type { Bau3Data, BauVariant } from '../src/features/economics/bau3Types'
import twoSeasonData from '../src/data/economics-bau2-series.json'
import sustainableData from '../src/data/economics-bauss-series.json'
import threeSeasonData from '../src/data/economics-bau3-series.json'

const variants = [
  { variant: 'bau2s' as BauVariant, cached: twoSeasonData as Bau3Data, file: 'economics-bau2-series.json', Component: Bau2ComparisonPage, title: 'BAU 2 vụ so với 1Mha', englishTitle: 'BAU 2 seasons vs 1Mha', label: 'BAU 2 vụ', englishLabel: 'Business as usual · 2 seasons', menu: 'BAU2S vs 1Mha', hash: '#economics-bau2-vs-1mha', count: 7680, income: 138.68793642075 },
  { variant: 'bauss' as BauVariant, cached: sustainableData as Bau3Data, file: 'economics-bauss-series.json', Component: BauSustainableComparisonPage, title: 'BAU bền vững so với 1Mha', englishTitle: 'BAU sustainable vs 1Mha', label: 'BAU bền vững', englishLabel: 'Business as usual · Sustainable', menu: 'BAUSS vs 1Mha', hash: '#economics-bauss-vs-1mha', count: 9456, income: 146.2863843741228 },
]

const fixture = 'datetime,Scenario Group,Season Type,Climate Type,Resource Scenario,Net Income,Avg Yield,Labor Intensity,Production Cost,Profit Margin\n' + [
  '2022-02-18,Business As Usual,2 Seasons,Mild Climate,Normal Economy,9999,6,100,10,30',
  '2027-02-18,Business As Usual,3 Seasons,Mild Climate,Normal Economy,10,6,100,10,30',
  '2027-02-18,Business As Usual,2 Seasons,Mild Climate,Normal Economy,20,6,100,10,30',
  '2027-02-18,Business As Usual,Sustainable,Mild Climate,Normal Economy,30,6,100,10,30',
  '2027-02-18,1Mha,2 Seasons,Mild Climate,Normal Economy,40,6,100,10,30',
].join('\n')

describe('BAU 2 seasons and sustainable comparisons', () => {
  it.each(variants)('selects exactly the season type for $variant in both languages', ({ variant }) => {
    const vietnamese = fixture.replaceAll('Business As Usual', 'Thường lệ').replaceAll('3 Seasons', '3 vụ').replaceAll('2 Seasons', '2 vụ').replaceAll('Sustainable', 'Bền vững').replaceAll('Mild Climate', 'Khí hậu ôn hòa').replaceAll('Normal Economy', 'Nền kinh tế bình thường')
    const result = aggregateBauComparisonData(fixture, vietnamese, variant)
    expect(result.variant).toBe(variant)
    expect(result.series).toHaveLength(8)
    const baseline = result.series.find((series) => series.family === variant && series.condition === 'mildNormal')!
    expect(baseline.USD[0].count).toBe(1)
    expect(baseline.USD[0].income).toBe(variant === 'bau2s' ? 20 : 30)
    expect(baseline.VND[0].income).toBe(baseline.USD[0].income)
    expect(result.series.find((series) => series.family === 'oneMha' && series.condition === 'mildNormal')!.USD[0].income).toBe(40)
  })

  it.each(variants)('matches CSVs and keeps the correct baseline and unchanged 1Mha data for $variant', ({ variant, cached, count, income }) => {
    const master = readFileSync(resolve('src/data/STAR_FARM CSV - Master file.csv'), 'utf8')
    const combined = readFileSync(resolve('src/data/STAR_FARM CSV - Dữ liệu tổng.csv'), 'utf8')
    expect(aggregateBauComparisonData(master, combined, variant)).toEqual(cached)
    expect(cached.series.reduce((total, series) => total + series.USD.reduce((sum, point) => sum + point.count, 0), 0)).toBe(count)
    expect(cached.series.find((series) => series.family === variant && series.condition === 'severeShortage')!.USD.at(-1)!.income).toBeCloseTo(income, 7)
    expect(cached.series.filter((series) => series.family === 'oneMha')).toEqual(threeSeasonData.series.filter((series) => series.family === 'oneMha'))
  })

  it.each(variants)('uses $variant in its observations without retaining BAU 3 seasons text', ({ cached, label, variant }) => {
    for (const metric of ['income', 'yield', 'labor', 'cost', 'margin'] as const) {
      const analysis = analyzeBau3(cached, metric, 'vi')!
      expect(analysis.paragraph).toContain(label)
      expect(analysis.paragraph).not.toContain('BAU 3 vụ')
      expect(analysis.paragraph).not.toMatch(/NaN|Infinity/)
    }
    if (variant === 'bau2s') {
      expect(analyzeBau3(cached, 'yield', 'vi')).toMatchObject({ lower: 4, higher: 0 })
      expect(analyzeBau3(cached, 'labor', 'vi')).toMatchObject({ higher: 4, lower: 0 })
      expect(analyzeBau3(cached, 'labor', 'vi')!.conclusion).toContain('cần nhiều giờ lao động hơn BAU 2 vụ')
    }
  })

  it.each(variants)('renders and translates five combined comparisons for $variant', ({ Component, title, englishTitle, label }) => {
    const { rerender } = render(<Component language="vi" />)
    expect(screen.getByRole('heading', { name: title })).toBeInTheDocument()
    expect(screen.getAllByRole('article')).toHaveLength(5)
    expect(screen.getAllByRole('complementary')).toHaveLength(5)
    expect(screen.getByRole('complementary', { name: 'Nhận xét · Thu nhập ròng' })).toHaveTextContent(label)
    const income = screen.getByRole('region', { name: 'Thu nhập ròng' })
    const pair = within(income).getAllByRole('article')
    expect(pair).toHaveLength(1)
    for (const card of pair) expect([...card.querySelectorAll('path.recharts-line-curve')].map((path) => path.getAttribute('stroke'))).toEqual([...Array(2)].flatMap(() => ['#3478c6', '#9362bc', '#ce762b', '#589044']))
    rerender(<Component language="en" />)
    expect(screen.getByRole('heading', { name: englishTitle })).toBeInTheDocument()
    const translated = within(screen.getByRole('region', { name: 'Net income' })).getAllByRole('article')
    expect(translated[0].querySelector('header')).toHaveTextContent(englishTitle.replace(' vs ', ' / '))
    for (const card of translated) expect(card.querySelector('header')).toHaveTextContent('Unit: USD/ha')
    expect(screen.getByRole('complementary', { name: 'What the comparison shows · Profit margin' })).toHaveTextContent('pp')
  })

  it.each(variants)('opens $variant through the menu and supports its direct URL and page navigation', async ({ menu, hash, title }) => {
    window.history.replaceState(null, '', hash)
    render(<App />)
    expect(await screen.findByRole('heading', { name: title })).toBeInTheDocument()
    expect(document.title).toBe(`${title} | STAR FARM`)
    fireEvent.click(screen.getByRole('button', { name: 'Kinh tế' }))
    fireEvent.click(screen.getByRole('button', { name: 'So sánh' }))
    expect(screen.getByRole('link', { name: menu })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: menu })).toHaveAttribute('href', hash)
    fireEvent.click(screen.getByRole('link', { name: 'Trang chủ' }))
    expect(await screen.findByRole('heading', { name: /Tác động của đề án/ })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Kinh tế' }))
    fireEvent.click(screen.getByRole('button', { name: 'So sánh' }))
    fireEvent.click(screen.getByRole('link', { name: menu }))
    expect(await screen.findByRole('heading', { name: title })).toBeInTheDocument()
  })
})
