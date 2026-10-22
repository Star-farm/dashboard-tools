import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import App from '../src/app/App'
import HomePage from '../src/features/home/HomePage'
import catalog from '../src/data/catalog.json'
import { parseCsv } from '../src/features/glossary/glossaryData'

describe('home page', () => {
  it('clears browser-restored focus on the mobile explore button while preserving intentional focus', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true }))
    const app = render(<HomePage language="vi" />)
    try {
      const explore = screen.getByRole('link', { name: 'Khám phá' })
      expect(explore).not.toHaveFocus()
      explore.focus()
      fireEvent(window, new Event('pageshow'))
      expect(explore).not.toHaveFocus()
      explore.focus()
      expect(explore).toHaveFocus()
    } finally {
      app.unmount()
      vi.unstubAllGlobals()
    }
  })

  it('opens the homepage by default and translates the hero and footer', () => {
    window.history.replaceState(null, '', window.location.pathname)
    render(<App />)
    expect(screen.getByRole('heading', { name: /Tác động của đề án/ })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Khám phá' })).toHaveAttribute('href', '#home-explore')
    for (const name of ['Về tương lai', 'Kinh tế', 'Tài nguyên', 'Môi trường']) expect(within(screen.getByRole('main')).getByRole('heading', { name })).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
    expect(screen.queryByText('Thư viện dữ liệu')).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Tải CSV/ })).not.toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: /Tra cứu thuật ngữ/ })[0]).toHaveAttribute('href', '#glossary')
    expect(document.title).toBe('STAR FARM | Tương lai của hạt gạo Đồng Tháp')
    expect(screen.getByText('© 2026 STAR-FARM · Bảo lưu mọi quyền.')).toBeInTheDocument()
    expect(within(screen.getByRole('banner')).queryByText(/^Chuyển đổi Nông nghiệp Sinh thái Thông minh/)).not.toBeInTheDocument()
    expect(within(screen.getByRole('contentinfo')).getByText(/^Chuyển đổi Nông nghiệp Sinh thái Thông minh/).tagName).toBe('EM')
    expect(screen.queryByText(/^Mục tiêu tổng thể của dự án STAR-FARM/)).not.toBeInTheDocument()
    expect(within(screen.getByRole('contentinfo')).queryByRole('heading', { name: 'Khám phá' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'English' }))
    expect(screen.getByRole('heading', { name: /The impact of the/ })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Explore' })).toHaveAttribute('href', '#home-explore')
    for (const name of ['About future', 'Economics', 'Resources', 'Environment']) expect(within(screen.getByRole('main')).getByRole('heading', { name })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Download CSV/ })).not.toBeInTheDocument()
    expect(screen.queryByText('Data for sustainable growing seasons.')).not.toBeInTheDocument()
    expect(screen.getByText('© 2026 STAR-FARM · All rights reserved.')).toBeInTheDocument()
    expect(screen.queryByText(/^The overall objective of the STAR-FARM project/)).not.toBeInTheDocument()
    expect(within(screen.getByRole('contentinfo')).queryByRole('heading', { name: 'Explore' })).not.toBeInTheDocument()
    expect(screen.queryByText('Sustainable agriculture')).not.toBeInTheDocument()
    expect(within(screen.getByRole('banner')).queryByText(/^Smart Agroecological Transformation/)).not.toBeInTheDocument()
    expect(within(screen.getByRole('contentinfo')).getByText(/^Smart Agroecological Transformation/)).toBeInTheDocument()
    expect(document.documentElement.lang).toBe('en')
  })

  it('opens deep links and retains language while navigating between pages', async () => {
    window.history.replaceState(null, '', '#home-explore')
    render(<App />)
    expect(screen.getByRole('region', { name: 'Khám phá nội dung' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'English' }))
    fireEvent.click(screen.getByRole('button', { name: 'View menu: Resources' }))
    expect(screen.getByRole('button', { name: 'Resources' })).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('button', { name: 'Overview' })).toBeInTheDocument()
    const menu = screen.getByRole('navigation', { name: 'Main menu' })
    fireEvent.click(within(menu).getByRole('link', { name: 'Glossary' }))
    expect(await screen.findByRole('heading', { name: 'Glossary' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'English' })).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(within(menu).getByRole('link', { name: 'Home' }))
    expect(await screen.findByRole('heading', { name: /The impact of the/ })).toBeInTheDocument()
  })

  it('keeps the glossary open when following the skip-content link', async () => {
    render(<App />)
    fireEvent.click(screen.getByRole('link', { name: 'Đến nội dung chính' }))
    expect(await screen.findByRole('table')).toBeInTheDocument()
  })

  it('smoothly scrolls from the hero to the explore section while staying on the homepage', async () => {
    window.history.replaceState(null, '', '#home')
    render(<App />)
    const explore = screen.getByRole('region', { name: 'Khám phá nội dung' })
    const scrollIntoView = vi.fn()
    explore.scrollIntoView = scrollIntoView
    fireEvent.click(screen.getByRole('link', { name: 'Khám phá' }))

    await waitFor(() => expect(scrollIntoView).toHaveBeenCalledWith({ block: 'start', behavior: 'smooth' }))
    expect(window.location.hash).toBe('#home-explore')
    expect(screen.getByRole('heading', { name: /Tác động của đề án/ })).toBeInTheDocument()
  })

  it.each(['#home', '#glossary', '#future-labor', '#scenario-resources'])('scrolls to the top without leaving %s', async (hash) => {
    window.history.replaceState(null, '', hash)
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
    render(<App />)
    const main = screen.getByRole('main')
    const title = await within(main).findByRole('heading', { level: 1 }, { timeout: 5000 })
    scrollTo.mockClear()

    const backToTop = screen.getByRole('button', { name: /Về đầu trang/ })
    expect(backToTop.closest('footer')).toBeNull()
    fireEvent.click(backToTop)

    expect(scrollTo).toHaveBeenCalledWith({ top: 0, left: 0, behavior: 'smooth' })
    expect(window.location.hash).toBe(hash)
    expect(title).toBeInTheDocument()
    expect(main).toHaveFocus()
  })
})

describe('original source datasets', () => {
  for (const dataset of catalog) {
    it(`matches the catalog to ${dataset.id} CSV`, () => {
      const source = readFileSync(resolve(process.cwd(), 'src/data', dataset.filename))
      const [headers, ...records] = parseCsv(source.toString('utf8'))
      expect(source.byteLength).toBe(dataset.bytes)
      expect(headers).toHaveLength(dataset.columns)
      expect(records).toHaveLength(dataset.rows)
      const years = records.map((row) => Number(row[headers.indexOf('datetime')].slice(0, 4)))
      expect(Math.min(...years)).toBe(dataset.yearStart)
      expect(Math.max(...years)).toBe(dataset.yearEnd)
      expect(new Set(records.map((row) => row[headers.indexOf('Scenario Code')])).size).toBe(dataset.scenarios)
      expect(headers.includes('seed')).toBe(dataset.id === 'master')
    })
  }
})
