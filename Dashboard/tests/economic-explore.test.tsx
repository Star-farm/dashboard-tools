import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import EconomicExplorePage from '../src/features/economics/EconomicExplorePage'
import App from '../src/app/App'

describe('economics exploration page', () => {
  it('shows all four groups and all nine available destinations without requiring expansion', () => {
    render(<EconomicExplorePage language="vi" />)
    expect(screen.getByRole('heading', { level: 1, name: 'Khám phá Kinh tế' })).toBeInTheDocument()
    for (const name of ['Tổng quan', 'So sánh', 'Canh tác như thường lệ', 'Một triệu hecta lúa']) {
      expect(screen.getByRole('region', { name })).toBeInTheDocument()
    }
    const destinations = {
      'Bảng thông tin': '#economics-overview',
      'Bảng so sánh': '#economics-comparison',
      'BAU3S vs 1Mha': '#economics-bau3-vs-1mha',
      'BAU2S vs 1Mha': '#economics-bau2-vs-1mha',
      'BAUSS vs 1Mha': '#economics-bauss-vs-1mha',
      '3 mùa vụ': '#economics-bau3',
      '2 mùa vụ': '#economics-bau2',
      'Bền vững': '#economics-bauss',
      'Xem các chỉ số 1Mha': '#economics-1mha',
    }
    expect(screen.getAllByRole('link')).toHaveLength(9)
    for (const [label, href] of Object.entries(destinations)) expect(screen.getByRole('link', { name: label })).toHaveAttribute('href', href)
    const bau = screen.getByRole('region', { name: 'Canh tác như thường lệ' })
    expect(within(bau).getAllByRole('link')).toHaveLength(3)
    const oneMha = screen.getByRole('region', { name: 'Một triệu hecta lúa' })
    expect(within(oneMha).getByRole('link', { name: 'Xem các chỉ số 1Mha' })).toHaveAttribute('href', '#economics-1mha')
    expect(screen.queryByText('Đang cập nhật')).not.toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('opens by direct URL, translates content and follows a destination without opening header menus', async () => {
    window.history.replaceState(null, '', '#economics-explore')
    render(<App />)
    expect(await screen.findByRole('heading', { level: 1, name: 'Khám phá Kinh tế' })).toBeInTheDocument()
    expect(document.title).toBe('Khám phá Kinh tế | STAR FARM')
    fireEvent.click(screen.getByRole('button', { name: 'English' }))
    expect(screen.getByRole('heading', { level: 1, name: 'Explore economics' })).toBeInTheDocument()
    expect(document.title).toBe('Explore economics | STAR FARM')
    expect(window.location.hash).toBe('#economics-explore')
    for (const name of ['Overview', 'Comparison', 'Business as usual', 'One million hectares of rice']) {
      expect(screen.getByRole('region', { name })).toBeInTheDocument()
    }
    expect(within(screen.getByRole('main')).queryByText('Coming soon')).not.toBeInTheDocument()
    expect(within(screen.getByRole('main')).getByRole('link', { name: 'View 1Mha indicators' })).toHaveAttribute('href', '#economics-1mha')
    const overview = screen.getByRole('region', { name: 'Overview' })
    fireEvent.click(within(overview).getByRole('link', { name: 'Information dashboard' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Economic viability overview' })).toBeInTheDocument()
    expect(window.location.hash).toBe('#economics-overview')
    expect(screen.getByRole('button', { name: 'Economics' })).toHaveAttribute('aria-expanded', 'false')
  })
})
