import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, within, waitFor } from '@testing-library/react'
import App from '../src/app/App'
import HeaderNavigation from '../src/app/HeaderNavigation'
import EconomicExplorePage from '../src/features/economics/EconomicExplorePage'
import ResourcesPage from '../src/features/resources/ResourcesPage'
import ResourceLineChart from '../src/features/resources/ResourceLineChart'
import { resourcePageForHash, resourcePageTitle, resourceRoutes } from '../src/features/resources/resourceRoutes'
import { resourceColors, resourceDomain, resourceNumber, resourceStats } from '../src/features/resources/resourceAnalysis'
import type { ResourceContentPage } from '../src/features/resources/resourceRoutes'
import type { ResourceData } from '../src/features/resources/resourceTypes'
import cached from '../src/data/resources.json'

const data = cached as ResourceData
describe('resource overview and comparison', () => {
  it('shows the historical row first, all eight columns, mobile cards and combined persistent-language filters', () => {
    const { rerender } = render(<ResourcesPage page="resourceOverview" language="vi" />)
    const table = screen.getByRole('table')
    expect(within(table).getAllByRole('row')).toHaveLength(19)
    expect(table.querySelector('tbody tr')).toHaveTextContent('Hiện trạng · 2016–2022')
    expect(table.querySelectorAll('thead tr:last-child th')).toHaveLength(8)
    expect(table).toHaveTextContent('kg N/ha')
    expect(screen.getAllByRole('article')).toHaveLength(17)
    expect(screen.getAllByRole('article')[0]).toHaveTextContent('Hiện trạng · 2016–2022')
    expect(screen.getAllByRole('combobox')).toHaveLength(5)
    fireEvent.change(screen.getByLabelText('Nhóm kịch bản'), { target: { value: 'oneMha' } })
    fireEvent.change(screen.getByLabelText('Thời tiết'), { target: { value: 'severe' } })
    expect(screen.getAllByRole('article')).toHaveLength(2)
    rerender(<ResourcesPage page="resourceOverview" language="en" />)
    expect(screen.getByLabelText('Scenario group')).toHaveValue('oneMha')
    expect(screen.getByLabelText('Weather')).toHaveValue('severe')
    expect(screen.getAllByRole('article')).toHaveLength(2)
    fireEvent.click(screen.getByRole('button', { name: /Clear filters/ }))
    expect(screen.getAllByRole('article')).toHaveLength(17)
  })

  it('shows three resource bar comparisons, updates actual values and findings with filters, and translates units', () => {
    const { rerender } = render(<ResourcesPage page="resourceComparison" language="vi" />)
    expect(screen.getAllByRole('article')).toHaveLength(3)
    expect(screen.getAllByRole('complementary')).toHaveLength(4)
    const summary = screen.getByRole('complementary', { name: 'Nhận xét tổng hợp' })
    expect(summary.compareDocumentPosition(screen.getAllByRole('article')[0]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    const before = screen.getAllByRole('article')[0].querySelector('.comparison-values')!.textContent
    fireEvent.click(screen.getByRole('button', { name: 'Khắc nghiệt' }))
    fireEvent.click(screen.getByRole('button', { name: 'Thiếu tài nguyên' }))
    const chart = screen.getAllByRole('article')[0]
    expect(chart.querySelector('.comparison-values')!.textContent).not.toBe(before)
    const expected = resourceStats(data.series.filter((series) => series.family === 'oneMha' && series.condition === 'severeShortage'), 'water').mean!
    expect(chart.querySelector('.comparison-values')).toHaveTextContent(resourceNumber(expected, 'vi'))
    rerender(<ResourcesPage page="resourceComparison" language="en" />)
    expect(screen.getByRole('button', { name: 'Severe weather' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getAllByRole('article')[2]).toHaveTextContent('applications')
    fireEvent.click(screen.getByRole('button', { name: /Clear filters/ }))
    expect(screen.getByRole('button', { name: 'All weather conditions' })).toHaveAttribute('aria-pressed', 'true')
  })
})

describe('resource model pages', () => {
  it.each(['resourceBau3', 'resourceBau2', 'resourceBauss', 'resourceOneMha'] as const)('renders isolated KPIs and annual plots for %s', (page) => {
    const { rerender } = render(<ResourcesPage page={page} language="vi" />)
    expect(screen.getByRole('heading', { level: 1, name: resourcePageTitle(page, 'vi') })).toBeInTheDocument()
    expect(screen.getAllByRole('term')).toHaveLength(3)
    expect(screen.getAllByRole('article')).toHaveLength(3)
    expect(screen.getAllByRole('complementary')).toHaveLength(4)
    const expected = resourceStats(data.series.filter((series) => series.family === resourceRoutes[page].family), 'water').mean!
    expect(screen.getAllByRole('definition')[0]).toHaveTextContent(resourceNumber(expected, 'vi'))
    for (const chart of screen.getAllByRole('article')) {
      expect(chart.querySelectorAll('circle.recharts-line-dot')).toHaveLength(96)
      expect([...chart.querySelectorAll('path.recharts-line-curve')].map((path) => path.getAttribute('stroke'))).toEqual(Object.values(resourceColors))
      expect(chart.nextElementSibling!.querySelectorAll('p')).toHaveLength(1)
    }
    rerender(<ResourcesPage page={page} language="en" />)
    expect(screen.getByRole('heading', { level: 1, name: resourcePageTitle(page, 'en') })).toBeInTheDocument()
    expect(screen.getByRole('complementary', { name: 'Overall assessment' })).toHaveTextContent('2050')
  }, 10000)

  it.each(['resourceBau3Comparison', 'resourceBau2Comparison', 'resourceBaussComparison'] as const)('shows three matching chart pairs and observations for %s', (page) => {
    render(<ResourcesPage page={page} language="vi" />)
    expect(screen.getAllByRole('article')).toHaveLength(6)
    expect(screen.getAllByRole('complementary')).toHaveLength(4)
    const charts = screen.getAllByRole('article')
    for (const chart of charts) {
      expect(chart.querySelectorAll('circle.recharts-line-dot')).toHaveLength(96)
      for (const path of chart.querySelectorAll('path.recharts-line-curve')) { expect(path.getAttribute('d')).not.toMatch(/[CQ]/); expect(path).not.toHaveAttribute('stroke-dasharray') }
    }
    expect(charts[0]).toHaveClass(`bau3-chart-${resourceRoutes[page].family}`)
    expect(charts[1]).toHaveClass('bau3-chart-oneMha')
  }, 10000)

  it('shows year and all four values in the yearly tooltip', async () => {
    const { container } = render(<ResourceLineChart data={data} family="oneMha" metric="water" domain={resourceDomain(data.series.filter((series) => series.family === 'oneMha'), 'water')} language="en" />)
    const wrapper = container.querySelector<HTMLElement>('.recharts-wrapper')!
    Object.defineProperty(wrapper, 'offsetWidth', { value: 620 }); Object.defineProperty(wrapper, 'offsetHeight', { value: 310 })
    vi.spyOn(wrapper, 'getBoundingClientRect').mockReturnValue({ x: 0, y: 0, left: 0, top: 0, width: 620, height: 310, right: 620, bottom: 310, toJSON: () => ({}) })
    const dots = container.querySelectorAll('circle.recharts-line-dot')
    fireEvent.mouseMove(dots[0], { clientX: Number(dots[0].getAttribute('cx')), clientY: Number(dots[0].getAttribute('cy')) })
    const tooltip = container.querySelector('.recharts-tooltip-wrapper')!
    await waitFor(() => expect(tooltip).toHaveTextContent('Year 2027'))
    expect(tooltip).toHaveStyle({ visibility: 'visible' })
    for (const series of data.series.filter((series) => series.family === 'oneMha')) expect(tooltip).toHaveTextContent(`${resourceNumber(series.points[0].values.water!, 'en')} mm`)
    fireEvent.mouseMove(dots[23], { clientX: Number(dots[23].getAttribute('cx')), clientY: Number(dots[23].getAttribute('cy')) })
    await waitFor(() => expect(tooltip).toHaveTextContent('Year 2050'))
  })
})

describe('resource navigation', () => {
  it.each([false, true])('connects all resource branches on the header (mobile: %s)', (mobile) => {
    render(<HeaderNavigation language="vi" page="resourceBau2" mobile={mobile} />)
    fireEvent.click(screen.getByRole('button', { name: 'Tài nguyên' }))
    for (const [branch, names] of [ ['Tổng quan', ['Bảng thông tin', 'Bảng so sánh']], ['So sánh', ['BAU3S vs 1Mha', 'BAU2S vs 1Mha', 'BAUSS vs 1Mha']], ['Canh tác như thường lệ', ['3 mùa vụ', '2 mùa vụ', 'Bền vững']] ] as const) {
      fireEvent.click(screen.getByRole('button', { name: branch }))
      for (const name of names) expect(screen.getByRole('link', { name }).getAttribute('href')).toMatch(/^#resources-/)
    }
    expect(screen.getByRole('link', { name: '2 mùa vụ' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: 'Một triệu hecta lúa' })).toHaveAttribute('href', '#resources-1mha')
  })

  it('shows a complete resource hub and opens it directly from the homepage', async () => {
    const { unmount } = render(<EconomicExplorePage language="vi" topic="resources" />)
    expect(screen.getAllByRole('link')).toHaveLength(9)
    for (const link of screen.getAllByRole('link')) expect(link.getAttribute('href')).toMatch(/^#resources-/)
    unmount()
    window.history.replaceState(null, '', '#home')
    render(<App />)
    fireEvent.click(screen.getByRole('link', { name: 'Khám phá Tài nguyên' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Khám phá Tài nguyên' })).toBeInTheDocument()
    expect(document.title).toBe('Khám phá Tài nguyên | STAR FARM')
  })

  it.each(Object.keys(resourceRoutes) as ResourceContentPage[])('opens and translates direct route %s', async (page) => {
    const hash = `#${resourceRoutes[page].anchor}`
    expect(resourcePageForHash(hash)).toBe(page)
    window.history.replaceState(null, '', hash)
    render(<App />)
    expect(await screen.findByRole('heading', { level: 1, name: resourcePageTitle(page, 'vi') })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'English' }))
    expect(document.title).toBe(`${resourcePageTitle(page, 'en')} | STAR FARM`)
    expect(window.location.hash).toBe(hash)
  }, 10000)
})
