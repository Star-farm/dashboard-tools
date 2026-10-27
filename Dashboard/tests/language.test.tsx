import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import App from '../src/app/App'
import { ErrorBoundary } from '../src/app/ErrorBoundary'
import { getInitialLanguage, LANGUAGE_STORAGE_KEY } from '../src/i18n'

describe('browser language and saved preference', () => {
  it.each([
    ['vi-VN', 'vi'], ['VI-vn', 'vi'], ['vi', 'vi'],
    ['en-US', 'en'], ['en-GB', 'en'], ['fr-FR', 'en'],
  ])('uses %s on the first visit with %s as the result', (browser, expected) => {
    vi.spyOn(navigator, 'languages', 'get').mockReturnValue([browser])
    expect(getInitialLanguage()).toBe(expected)
    expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBeNull()
  })

  it('uses the primary browser language and falls back to navigator.language', () => {
    vi.spyOn(navigator, 'languages', 'get').mockReturnValue(['en-US', 'vi-VN'])
    expect(getInitialLanguage()).toBe('en')
    vi.spyOn(navigator, 'languages', 'get').mockReturnValue([])
    vi.spyOn(navigator, 'language', 'get').mockReturnValue('vi-VN')
    expect(getInitialLanguage()).toBe('vi')
  })

  it('prefers a saved choice and ignores invalid stored values', () => {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, 'en')
    expect(getInitialLanguage()).toBe('en')
    localStorage.setItem(LANGUAGE_STORAGE_KEY, 'invalid')
    expect(getInitialLanguage()).toBe('vi')
  })

  it('keeps language switching working when storage is blocked', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked') })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked') })
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'English' }))
    expect(screen.getByRole('heading', { name: 'Glossary' })).toBeInTheDocument()
    expect(document.documentElement.lang).toBe('en-US')
  })
})

describe('bilingual glossary and navigation', () => {
  it('shows English UI and CSV definitions for an English browser', () => {
    vi.spyOn(navigator, 'languages', 'get').mockReturnValue(['en-US'])
    render(<App />)
    expect(screen.getByRole('heading', { name: 'Glossary' })).toBeInTheDocument()
    expect(screen.getByLabelText('Find a term')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Economics5' })).toBeInTheDocument()
    expect(screen.getByText(/^Total profit earned per hectare/)).toBeInTheDocument()
    const names = screen.getAllByRole('rowheader').map((row) => row.querySelector('.term-name')?.textContent ?? '')
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b, 'en')))
    expect(document.title).toBe('Glossary | STAR FARM')
    expect(document.documentElement.lang).toBe('en-US')
  })

  it('preserves filters and sort on switch, and remembers the choice after remount', () => {
    const app = render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Kinh tế5' }))
    fireEvent.change(screen.getByLabelText('Tìm thuật ngữ'), { target: { value: 'thu nhap rong' } })
    fireEvent.click(screen.getByRole('button', { name: 'Sắp xếp tên giảm dần' }))
    fireEvent.click(screen.getByRole('button', { name: 'English' }))
    expect(screen.getByRole('status')).toHaveTextContent('1 / 31 terms')
    expect(screen.getByRole('rowheader', { name: /Net Income/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Economics5' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('columnheader', { name: /Term/ })).toHaveAttribute('aria-sort', 'descending')
    expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('en')
    app.unmount()
    render(<App />)
    expect(screen.getByRole('heading', { name: 'Glossary' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Tiếng Việt' }))
    expect(screen.getByRole('heading', { name: 'Bảng định nghĩa' })).toBeInTheDocument()
    expect(document.documentElement.lang).toBe('vi')
    expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('vi')
  })

  it('translates the empty state, clear and reset controls', () => {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, 'en')
    render(<App />)
    fireEvent.change(screen.getByLabelText('Find a term'), { target: { value: 'nothing-matches-this' } })
    expect(screen.getByText('No terms found')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reset filters' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Clear search' }))
    expect(screen.getByRole('status')).toHaveTextContent('31 / 31 terms')
  })

  it('provides translated menu links between home and glossary', async () => {
    render(<App />)
    const menu = screen.getByRole('navigation', { name: 'Menu chính' })
    expect(within(menu).getAllByRole('link').map((link) => link.textContent)).toEqual(['Trang chủ', 'Bảng định nghĩa', 'Về tương lai', 'Chi tiết kịch bản', 'Kinh tế', 'Tài nguyên', 'Môi trường'])
    fireEvent.click(within(menu).getByRole('link', { name: 'Trang chủ' }))
    expect(await screen.findByRole('heading', { name: /Tác động của đề án/ })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'English' }))
    expect(within(screen.getByRole('navigation', { name: 'Main menu' })).queryByRole('link', { name: 'Data' })).not.toBeInTheDocument()
    expect(within(menu).getAllByRole('link').map((link) => link.textContent)).toEqual(['Home', 'Glossary', 'About the future', 'Scenario details', 'Economics', 'Resources', 'Environment'])
    fireEvent.click(within(menu).getByRole('link', { name: 'Glossary' }))
    expect(await screen.findByRole('heading', { name: 'Glossary' })).toBeInTheDocument()
  })

  it('localizes the error fallback', () => {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, 'en')
    vi.spyOn(console, 'error').mockImplementation(() => {})
    function BrokenContent(): never { throw new Error('Invalid CSV') }
    render(<ErrorBoundary><BrokenContent /></ErrorBoundary>)
    expect(screen.getByRole('alert')).toHaveTextContent('404')
    expect(screen.getByRole('button', { name: 'Reload page' })).toBeInTheDocument()
  })
})
