import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import App from '../src/app/App'

describe('mobile header menu', () => {
  let mobile: boolean
  let viewportChanged: (() => void) | undefined

  beforeEach(() => {
    mobile = true
    vi.spyOn(window, 'scrollY', 'get').mockReturnValue(0)
    viewportChanged = undefined
    vi.stubGlobal('matchMedia', () => ({
      matches: mobile,
      addEventListener: (_event: string, callback: () => void) => { viewportChanged = callback },
      removeEventListener: () => {},
    }))
    HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) {
      this.setAttribute('open', '')
    })
    HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) {
      this.removeAttribute('open')
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    Reflect.deleteProperty(HTMLDialogElement.prototype, 'showModal')
    Reflect.deleteProperty(HTMLDialogElement.prototype, 'close')
  })

  it('hides on downward page scroll, returns on upward scroll, and remains visible while the menu is open', () => {
    render(<App />)
    const header = screen.getByRole('banner')
    const scroll = (y: number) => {
      vi.spyOn(window, 'scrollY', 'get').mockReturnValue(y)
      fireEvent.scroll(window)
    }

    scroll(150)
    expect(header).toHaveClass('header-hidden')
    scroll(148)
    expect(header).toHaveClass('header-hidden')
    scroll(130)
    expect(header).not.toHaveClass('header-hidden')
    scroll(0)
    expect(header).not.toHaveClass('header-hidden')

    fireEvent.click(screen.getByRole('button', { name: 'Mở menu' }))
    scroll(300)
    expect(header).not.toHaveClass('header-hidden')
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Đóng menu' }))
    scroll(340)
    expect(header).toHaveClass('header-hidden')
    scroll(0)
    expect(header).not.toHaveClass('header-hidden')
  })

  it('opens a modal menu, switches language, and closes after choosing a page', async () => {
    document.body.style.overflow = 'auto'
    render(<App />)
    const trigger = screen.getByRole('button', { name: 'Mở menu' })
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('navigation', { name: 'Menu chính' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'English' })).not.toBeInTheDocument()
    fireEvent.click(trigger)

    const dialog = screen.getByRole('dialog', { name: 'Menu chính' })
    expect(dialog).toContainElement(document.activeElement as HTMLElement)
    expect(within(dialog).getByRole('button', { name: 'Đóng menu' })).not.toHaveFocus()
    expect(within(dialog).getByRole('link', { name: 'STAR FARM — Trang chủ' })).not.toHaveFocus()
    expect(document.body.style.overflow).toBe('hidden')
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    fireEvent.click(within(dialog).getByRole('button', { name: 'English' }))
    expect(within(dialog).getByRole('button', { name: 'English' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('heading', { name: 'Glossary' })).toBeInTheDocument()
    fireEvent.click(within(dialog).getByRole('link', { name: 'Home' }))
    expect(await screen.findByRole('heading', { name: /The impact of the/ })).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(document.body.style.overflow).toBe('auto')
    expect(trigger).toHaveFocus()
    document.body.style.overflow = ''
  })

  it('expands and collapses nested menus by tapping and closes with the X or Escape', () => {
    render(<App />)
    const trigger = screen.getByRole('button', { name: 'Mở menu' })
    fireEvent.click(trigger)
    const economics = screen.getByRole('button', { name: 'Kinh tế' })
    fireEvent.click(economics)
    const comparison = screen.getByRole('button', { name: 'So sánh' })
    fireEvent.click(comparison)
    expect(screen.getByRole('button', { name: 'BAU3S vs 1Mha' })).toBeInTheDocument()
    fireEvent.click(comparison)
    expect(screen.queryByRole('button', { name: 'BAU3S vs 1Mha' })).not.toBeInTheDocument()
    fireEvent.click(economics)
    expect(economics).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(screen.getByRole('button', { name: 'Đóng menu' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()

    fireEvent.click(trigger)
    fireEvent(screen.getByRole('dialog'), new Event('cancel', { bubbles: false, cancelable: true }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(document.body.style.overflow).toBe('')
  })

  it('opens a topic from the homepage and restores desktop navigation when resized', () => {
    window.history.replaceState(null, '', '#home')
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Xem menu: Tài nguyên' }))
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByRole('button', { name: 'Tài nguyên' })).toHaveAttribute('aria-expanded', 'true')
    expect(within(dialog).getByRole('button', { name: 'Tổng quan' })).toBeInTheDocument()

    act(() => { mobile = false; viewportChanged?.() })
    expect(screen.queryByRole('button', { name: 'Mở menu' })).not.toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Menu chính' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'English' })).toBeInTheDocument()
    expect(document.body.style.overflow).toBe('')
  })
})
