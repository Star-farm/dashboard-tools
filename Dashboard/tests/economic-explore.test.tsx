import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import EconomicExplorePage from '../src/features/economics/EconomicExplorePage'
import App from '../src/app/App'

describe('economics exploration page', () => {
  it('shows four parent cards and leaves their child destinations on separate pages', () => {
    render(<EconomicExplorePage language="vi" />)
    expect(screen.getByRole('heading', { level: 1, name: 'Khám phá Kinh tế' })).toBeInTheDocument()
    for (const name of ['Tổng quan', 'So sánh', 'Canh tác như thường lệ', 'Một triệu hecta lúa']) {
      expect(screen.getByRole('region', { name })).toBeInTheDocument()
    }
    const destinations = {
      'Tổng quan': '#economics-explore-overview',
      'So sánh': '#economics-explore-comparison',
      'Canh tác như thường lệ': '#economics-explore-bau',
      'Một triệu hecta lúa': '#economics-1mha',
    }
    expect(screen.getAllByRole('link')).toHaveLength(4)
    for (const [label, href] of Object.entries(destinations)) expect(screen.getByRole('link', { name: label })).toHaveAttribute('href', href)
    expect(screen.queryByRole('list')).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Bảng thông tin' })).not.toBeInTheDocument()
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
    expect(within(screen.getByRole('main')).getByRole('link', { name: 'One million hectares of rice' })).toHaveAttribute('href', '#economics-1mha')
    const overview = screen.getByRole('region', { name: 'Overview' })
    fireEvent.click(within(overview).getByRole('link', { name: 'Overview' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Overview' })).toBeInTheDocument()
    fireEvent.click(within(screen.getByRole('main')).getByRole('link', { name: 'Information dashboard' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Economic viability overview' })).toBeInTheDocument()
    expect(window.location.hash).toBe('#economics-overview')
    expect(screen.getByRole('button', { name: 'Economics' })).toHaveAttribute('aria-expanded', 'false')
  })
})
