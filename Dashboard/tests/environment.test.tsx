import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, within, waitFor } from '@testing-library/react'
import App from '../src/app/App'
import HeaderNavigation from '../src/app/HeaderNavigation'
import EconomicExplorePage from '../src/features/economics/EconomicExplorePage'
import EnvironmentPage from '../src/features/environment/EnvironmentPage'
import EnvironmentLineChart from '../src/features/environment/EnvironmentLineChart'
import { environmentPageForHash, environmentPageTitle, environmentRoutes } from '../src/features/environment/environmentRoutes'
import { environmentAwdStats, environmentColors, environmentDomain, environmentNumber, environmentStats } from '../src/features/environment/environmentAnalysis'
import type { EnvironmentContentPage } from '../src/features/environment/environmentRoutes'
import type { EnvironmentData } from '../src/features/environment/environmentTypes'
import cached from '../src/data/environment.json'

const data = cached as EnvironmentData
describe('environmental overview and comparison', () => {
  it('shows historical conditions first, seven columns, correct intensity units and persistent filters', () => {
    const { rerender } = render(<EnvironmentPage page="environmentOverview" language="vi" />)
    const table = screen.getByRole('table')
    expect(within(table).getAllByRole('row')).toHaveLength(19)
    expect(table.querySelector('tbody tr')).toHaveTextContent('Hiện trạng · 2016–2022')
    expect(table.querySelectorAll('thead tr:last-child th')).toHaveLength(7)
    expect(table).toHaveTextContent('kg CH₄/tấn gạo')
    expect(table).toHaveTextContent('kg CH₄/ha')
    expect(screen.getAllByRole('article')).toHaveLength(17)
    expect(screen.getAllByRole('combobox')).toHaveLength(5)
    fireEvent.change(screen.getByLabelText('Nhóm kịch bản'), { target: { value: 'oneMha' } })
    fireEvent.change(screen.getByLabelText('Thời tiết'), { target: { value: 'severe' } })
    expect(screen.getAllByRole('article')).toHaveLength(2)
    rerender(<EnvironmentPage page="environmentOverview" language="en" />)
    expect(screen.getByLabelText('Scenario group')).toHaveValue('oneMha')
    expect(screen.getByLabelText('Weather')).toHaveValue('severe')
    expect(screen.getByRole('table')).toHaveTextContent('kg CH₄/t rice')
    fireEvent.click(screen.getByRole('button', { name: /Clear filters/ }))
    expect(screen.getAllByRole('article')).toHaveLength(17)
    fireEvent.change(screen.getByLabelText('AWD adoption'), { target: { value: 'with' } })
    expect(screen.getAllByRole('article')).toHaveLength(8)
  })

  it('shows two bar comparisons with summary and individual findings, and updates values with both filters', () => {
    const { rerender } = render(<EnvironmentPage page="environmentComparison" language="vi" />)
    expect(screen.getAllByRole('article')).toHaveLength(2)
    expect(screen.getAllByRole('complementary')).toHaveLength(3)
    const summary = screen.getByRole('complementary', { name: 'Nhận xét tổng hợp' })
    expect(summary).toHaveTextContent('AWD')
    expect(summary.compareDocumentPosition(screen.getAllByRole('article')[0]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    const before = screen.getAllByRole('article')[1].querySelector('.comparison-values')!.textContent
    fireEvent.click(screen.getByRole('button', { name: 'Khắc nghiệt' }))
    fireEvent.click(screen.getByRole('button', { name: 'Thiếu tài nguyên' }))
    const chart = screen.getAllByRole('article')[1]
    expect(chart.querySelector('.comparison-values')!.textContent).not.toBe(before)
    const expected = environmentStats(data.series.filter((series) => series.family === 'oneMha' && series.condition === 'severeShortage'), 'methane').mean!
    expect(chart.querySelector('.comparison-values')).toHaveTextContent(environmentNumber(expected, 'vi'))
    rerender(<EnvironmentPage page="environmentComparison" language="en" />)
    expect(screen.getByRole('button', { name: 'Severe weather' })).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(screen.getByRole('button', { name: /Clear filters/ }))
    expect(screen.getByRole('button', { name: 'All weather conditions' })).toHaveAttribute('aria-pressed', 'true')
  })
})

describe('environmental model pages', () => {
  it.each(['environmentBau3', 'environmentBau2', 'environmentBauss', 'environmentOneMha'] as const)('shows two emission KPIs, AWD rate and yearly plots for %s', (page) => {
    const { rerender } = render(<EnvironmentPage page={page} language="vi" />)
    expect(screen.getByRole('heading', { level: 1, name: environmentPageTitle(page, 'vi') })).toBeInTheDocument()
    expect(screen.getAllByRole('term')).toHaveLength(3)
    expect(screen.getAllByRole('article')).toHaveLength(2)
    expect(screen.getAllByRole('complementary')).toHaveLength(3)
    const selected = data.series.filter((series) => series.family === environmentRoutes[page].family)
    expect(screen.getAllByRole('definition')[0]).toHaveTextContent(environmentNumber(environmentStats(selected, 'intensity').mean!, 'vi'))
    expect(screen.getByText('Tỷ lệ áp dụng AWD').parentElement).toHaveTextContent(`${environmentNumber(environmentAwdStats(selected).mean!, 'vi')}%`)
    for (const chart of screen.getAllByRole('article')) {
      expect(chart.querySelectorAll('circle.recharts-line-dot')).toHaveLength(96)
      expect([...chart.querySelectorAll('path.recharts-line-curve')].map((path) => path.getAttribute('stroke'))).toEqual(Object.values(environmentColors))
      expect(chart.nextElementSibling!.querySelectorAll('p')).toHaveLength(1)
      expect(chart.nextElementSibling!.querySelectorAll('strong').length).toBeGreaterThan(3)
    }
    rerender(<EnvironmentPage page={page} language="en" />)
    expect(screen.getByRole('heading', { level: 1, name: environmentPageTitle(page, 'en') })).toBeInTheDocument()
    expect(screen.getByText('AWD adoption rate')).toBeInTheDocument()
  }, 10000)

  it.each(['environmentBau3Comparison', 'environmentBau2Comparison', 'environmentBaussComparison'] as const)('shows two combined charts and observations for %s', (page) => {
    render(<EnvironmentPage page={page} language="vi" />)
    expect(screen.getAllByRole('article')).toHaveLength(2)
    expect(screen.getAllByRole('complementary')).toHaveLength(3)
    for (const chart of screen.getAllByRole('article')) {
      expect(chart.querySelectorAll('circle.recharts-line-dot')).toHaveLength(192)
      expect(chart.querySelectorAll('path.recharts-line-curve')).toHaveLength(8)
      for (const path of chart.querySelectorAll('path.recharts-line-curve')) { expect(path.getAttribute('d')).not.toMatch(/[CQ]/); expect(path).not.toHaveAttribute('stroke-dasharray') }
    }
    expect(screen.getAllByRole('article')[0]).toHaveClass('scenario-comparison-chart')
    expect(screen.getAllByRole('article')[0].querySelector('header')).toHaveTextContent('1Mha')
    expect(screen.getByRole('complementary', { name: 'Nhận xét tổng hợp' })).toHaveTextContent('AWD')
  }, 10000)

  it('shows the selected year and scaled emission intensity in the tooltip', async () => {
    const { container } = render(<EnvironmentLineChart data={data} family="oneMha" metric="intensity" domain={environmentDomain(data.series.filter((series) => series.family === 'oneMha'), 'intensity')} language="en" />)
    const wrapper = container.querySelector<HTMLElement>('.recharts-wrapper')!
    Object.defineProperty(wrapper, 'offsetWidth', { value: 620 }); Object.defineProperty(wrapper, 'offsetHeight', { value: 310 })
    vi.spyOn(wrapper, 'getBoundingClientRect').mockReturnValue({ x: 0, y: 0, left: 0, top: 0, width: 620, height: 310, right: 620, bottom: 310, toJSON: () => ({}) })
    const dots = container.querySelectorAll('circle.recharts-line-dot')
    fireEvent.mouseMove(dots[0], { clientX: Number(dots[0].getAttribute('cx')), clientY: Number(dots[0].getAttribute('cy')) })
    const tooltip = container.querySelector('.recharts-tooltip-wrapper')!
    await waitFor(() => expect(tooltip).toHaveTextContent('Year 2027'))
    for (const series of data.series.filter((series) => series.family === 'oneMha')) expect(tooltip).toHaveTextContent(`${environmentNumber(series.points[0].values.intensity!, 'en')} kg CH₄/t rice`)
    fireEvent.mouseMove(dots[23], { clientX: Number(dots[23].getAttribute('cx')), clientY: Number(dots[23].getAttribute('cy')) })
    await waitFor(() => expect(tooltip).toHaveTextContent('Year 2050'))
  })
})

describe('environmental navigation', () => {
  it.each([false, true])('connects all environment menu branches (mobile: %s)', (mobile) => {
    render(<HeaderNavigation language="vi" page="environmentBau2" mobile={mobile} />)
    fireEvent.click(screen.getByRole('button', { name: 'Môi trường' }))
    for (const [branch, names] of [ ['Tổng quan', ['Bảng thông tin', 'Bảng so sánh']], ['So sánh', ['BAU3S vs 1Mha', 'BAU2S vs 1Mha', 'BAUSS vs 1Mha']], ['Canh tác như thường lệ', ['3 mùa vụ', '2 mùa vụ', 'Bền vững']] ] as const) {
      fireEvent.click(screen.getByRole('button', { name: branch }))
      for (const name of names) expect(screen.getByRole('link', { name }).getAttribute('href')).toMatch(/^#environment-/)
    }
    expect(screen.getByRole('link', { name: '2 mùa vụ' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: 'Một triệu hecta lúa' })).toHaveAttribute('href', '#environment-1mha')
  })

  it('shows all nine destinations and opens the hub from the homepage', async () => {
    const { unmount } = render(<EconomicExplorePage language="vi" topic="sustainability" />)
    expect(screen.getAllByRole('link')).toHaveLength(9)
    for (const link of screen.getAllByRole('link')) expect(link.getAttribute('href')).toMatch(/^#environment-/)
    unmount()
    window.history.replaceState(null, '', '#home')
    render(<App />)
    fireEvent.click(screen.getByRole('link', { name: 'Khám phá Môi trường' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Khám phá Môi trường' })).toBeInTheDocument()
    expect(document.title).toBe('Khám phá Môi trường | STAR FARM')
  })

  it.each(Object.keys(environmentRoutes) as EnvironmentContentPage[])('opens and translates direct route %s', async (page) => {
    const hash = `#${environmentRoutes[page].anchor}`
    expect(environmentPageForHash(hash)).toBe(page)
    window.history.replaceState(null, '', hash)
    render(<App />)
    expect(await screen.findByRole('heading', { level: 1, name: environmentPageTitle(page, 'vi') })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'English' }))
    expect(document.title).toBe(`${environmentPageTitle(page, 'en')} | STAR FARM`)
    expect(window.location.hash).toBe(hash)
  }, 10000)
})
