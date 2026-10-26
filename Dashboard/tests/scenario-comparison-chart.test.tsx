import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import ScenarioComparisonChart from '../src/components/ScenarioComparisonChart'
import { bau3Text } from '../src/features/economics/bau3Text'

const point = (year: number, value: number) => ({ year, severeShortage: value, severeNormal: value + 1, mildShortage: value + 2, mildNormal: value + 3 })
const props = {
  language: 'en' as const, title: 'Net income', baselineLabel: 'BAU 3 seasons', startYear: 2027, endYear: 2050,
  baseline: [point(2050, -10), point(2027, 10)], oneMha: [point(2027, 100), point(2050, 200)],
  domain: [-50, 250] as [number, number], unit: 'USD/ha', formatValue: (value: number) => value.toFixed(2),
}

function selectChartYear(container: HTMLElement, year: number, touch = false) {
  const wrapper = container.querySelector<HTMLElement>('.recharts-wrapper')!
  Object.defineProperty(wrapper, 'offsetWidth', { value: 620, configurable: true })
  Object.defineProperty(wrapper, 'offsetHeight', { value: 340, configurable: true })
  vi.spyOn(wrapper, 'getBoundingClientRect').mockReturnValue({ x: 0, y: 0, left: 0, top: 0, width: 620, height: 340, right: 620, bottom: 340, toJSON: () => ({}) })
  const positions = [...container.querySelectorAll('circle.recharts-line-dot')].map((dot) => Number(dot.getAttribute('cx')))
  const firstX = Math.min(...positions), lastX = Math.max(...positions)
  const clientX = firstX + (year - props.startYear) / (props.endYear - props.startYear) * (lastX - firstX)
  if (touch) {
    fireEvent.touchStart(wrapper, { touches: [{ clientX, clientY: 150 }] })
    fireEvent.touchEnd(wrapper, { changedTouches: [{ clientX, clientY: 150 }] })
  }
  // A tap also generates a click in the browser.
  fireEvent.click(wrapper, { clientX, clientY: 150 })
}

describe('combined scenario chart', () => {
  it('selects years directly on the chart without a slider and preserves negative, zero and missing values', async () => {
    const { container } = render(<ScenarioComparisonChart {...props} baseline={[...props.baseline, { ...point(2030, 0), mildNormal: null }]} />)
    expect(screen.queryByRole('slider')).not.toBeInTheDocument()
    let table = screen.getByRole('table', { name: 'Net income · Year 2027 · USD/ha' })
    expect(within(table).getAllByRole('row')).toHaveLength(5)
    let row = within(table).getByRole('row', { name: /Severe weather · Resource shortage/ })
    expect(within(row).getAllByRole('cell').map((cell) => cell.textContent)).toEqual(['10.00', '100.00'])
    selectChartYear(container, 2030)
    table = await screen.findByRole('table', { name: 'Net income · Year 2030 · USD/ha' })
    row = within(table).getByRole('row', { name: /Severe weather · Resource shortage/ })
    expect(within(row).getAllByRole('cell').map((cell) => cell.textContent)).toEqual(['0.00', '—'])
    const missing = within(table).getByRole('row', { name: /Normal weather · Normal resources/ })
    expect(within(missing).getAllByRole('cell').map((cell) => cell.textContent)).toEqual(['—', '—'])
    selectChartYear(container, 2050)
    await screen.findByRole('table', { name: 'Net income · Year 2050 · USD/ha' })
    row = within(screen.getByRole('table')).getByRole('row', { name: /Severe weather · Resource shortage/ })
    expect(within(row).getAllByRole('cell').map((cell) => cell.textContent)).toEqual(['-10.00', '200.00'])
  })

  it('focuses a condition on both families together and preserves selection and year when translating', async () => {
    const { container, rerender } = render(<ScenarioComparisonChart {...props} />)
    expect(container.querySelectorAll('path.recharts-line-curve')).toHaveLength(8)
    fireEvent.click(screen.getByRole('button', { name: bau3Text.en.mildShortage }))
    expect(container.querySelectorAll('path.recharts-line-curve')).toHaveLength(2)
    fireEvent.click(screen.getByRole('button', { name: bau3Text.en.mildShortage }))
    expect(container.querySelectorAll('path.recharts-line-curve')).toHaveLength(2)
    expect(within(screen.getByRole('table')).getAllByRole('row')).toHaveLength(2)
    expect([...container.querySelectorAll('path.recharts-line-curve')].map((path) => path.getAttribute('stroke'))).toEqual(['#ce762b', '#ce762b'])
    selectChartYear(container, 2050)
    await screen.findByRole('table', { name: 'Net income · Year 2050 · USD/ha' })
    rerender(<ScenarioComparisonChart {...props} language="vi" baselineLabel="BAU 3 vụ" />)
    expect(screen.getByRole('button', { name: bau3Text.vi.mildShortage })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('table', { name: 'Net income · Năm 2050 · USD/ha' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Tất cả điều kiện' }))
    expect(container.querySelectorAll('path.recharts-line-curve')).toHaveLength(8)
  })

  it('keeps the clicked year visible when the pointer moves or leaves the chart', async () => {
    const { container } = render(<ScenarioComparisonChart {...props} baseline={Array.from({ length: 24 }, (_, index) => point(2027 + index, index))} />)
    const wrapper = container.querySelector<HTMLElement>('.recharts-wrapper')!
    Object.defineProperty(wrapper, 'offsetWidth', { value: 620 }); Object.defineProperty(wrapper, 'offsetHeight', { value: 340 })
    vi.spyOn(wrapper, 'getBoundingClientRect').mockReturnValue({ x: 0, y: 0, left: 0, top: 0, width: 620, height: 340, right: 620, bottom: 340, toJSON: () => ({}) })
    const dot = container.querySelectorAll('circle.recharts-line-dot')[23]
    fireEvent.click(dot, { clientX: Number(dot.getAttribute('cx')), clientY: Number(dot.getAttribute('cy')) })
    await waitFor(() => expect(screen.getByRole('table', { name: 'Net income · Year 2050 · USD/ha' })).toBeInTheDocument())
    const table = screen.getByRole('table', { name: 'Net income · Year 2050 · USD/ha' })
    const row = within(table).getByRole('row', { name: /Severe weather · Resource shortage/ })
    expect(within(row).getAllByRole('cell').map((cell) => cell.textContent)).toEqual(['23.00', '200.00'])
    fireEvent.mouseMove(container.querySelector('circle.recharts-line-dot')!, { clientX: 68, clientY: 150 })
    fireEvent.mouseLeave(wrapper)
    expect(screen.getByRole('table', { name: 'Net income · Year 2050 · USD/ha' })).toBeInTheDocument()
  })

  it('shows the tapped year on touch devices and supports keyboard selection without a slider', async () => {
    const { container } = render(<ScenarioComparisonChart {...props} />)
    selectChartYear(container, 2050, true)
    await screen.findByRole('table', { name: 'Net income · Year 2050 · USD/ha' })
    const plot = screen.getByRole('group', { name: /Net income · BAU 3 seasons \/ 1Mha/ })
    fireEvent.keyDown(plot, { key: 'ArrowLeft' })
    expect(screen.getByRole('table', { name: 'Net income · Year 2049 · USD/ha' })).toHaveTextContent('—')
    fireEvent.keyDown(plot, { key: 'Home' })
    expect(screen.getByRole('table', { name: 'Net income · Year 2027 · USD/ha' })).toBeInTheDocument()
    fireEvent.keyDown(plot, { key: 'ArrowLeft' })
    expect(screen.getByRole('table', { name: 'Net income · Year 2027 · USD/ha' })).toBeInTheDocument()
    fireEvent.keyDown(plot, { key: 'End' })
    expect(screen.getByRole('table', { name: 'Net income · Year 2050 · USD/ha' })).toBeInTheDocument()
  })

  it('does not invent values when no condition has data', () => {
    const { container } = render(<ScenarioComparisonChart {...props} baseline={[]} oneMha={[]} />)
    expect(screen.getByText(bau3Text.en.noData)).toBeInTheDocument()
    expect(container.querySelectorAll('path.recharts-line-curve')).toHaveLength(0)
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  it('filters models and conditions independently and keeps BAU dashed', () => {
    const { container } = render(<ScenarioComparisonChart {...props} />)
    fireEvent.click(screen.getByRole('button', { name: '1Mha · bold line' }))
    expect(container.querySelectorAll('path.recharts-line-curve')).toHaveLength(4)
    for (const path of container.querySelectorAll('path.recharts-line-curve')) expect(path).not.toHaveAttribute('stroke-dasharray')
    expect(screen.queryByRole('columnheader', { name: 'BAU 3 seasons' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'BAU 3 seasons · faint dashed line' }))
    expect(screen.queryByRole('columnheader', { name: '1Mha' })).not.toBeInTheDocument()
    for (const path of container.querySelectorAll('path.recharts-line-curve')) expect(path).toHaveAttribute('stroke-dasharray', '6 4')
    fireEvent.click(screen.getByRole('button', { name: bau3Text.en.mildShortage }))
    expect(container.querySelectorAll('path.recharts-line-curve')).toHaveLength(1)
    fireEvent.click(screen.getByRole('button', { name: 'All models' }))
    expect(container.querySelectorAll('path.recharts-line-curve')).toHaveLength(2)
  })
})
