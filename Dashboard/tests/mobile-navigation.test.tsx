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

  it('keeps the modal menu open while the page scrolls', () => {
    render(<App />)
    const scroll = (y: number) => {
      vi.spyOn(window, 'scrollY', 'get').mockReturnValue(y)
      fireEvent.scroll(window)
    }

    fireEvent.click(screen.getByRole('button', { name: 'Mở menu' }))
    scroll(300)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Đóng menu' }))
    scroll(340)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
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

  it('opens topic and branch menus before following a page link', async () => {
    window.history.replaceState(null, '', '#home')
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Mở menu' }))
    const dialog = screen.getByRole('dialog')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Kinh tế' }))
    fireEvent.click(within(dialog).getByRole('button', { name: 'Tổng quan' }))
    fireEvent.click(within(dialog).getByRole('link', { name: 'Bảng thông tin' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Tổng quan kinh tế' })).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(document.body.style.overflow).not.toBe('hidden')
    expect(window.location.hash).toBe('#economics-overview')
  })

  it('expands and collapses nested menus by tapping and closes with the X or Escape', () => {
    render(<App />)
    const trigger = screen.getByRole('button', { name: 'Mở menu' })
    fireEvent.click(trigger)
    const economics = screen.getByRole('button', { name: 'Kinh tế' })
    fireEvent.click(economics)
    const comparison = screen.getByRole('button', { name: 'So sánh chi tiết' })
    fireEvent.click(comparison)
    expect(screen.getByRole('link', { name: 'BAU3S vs 1Mha' })).toBeInTheDocument()
    fireEvent.click(comparison)
    expect(screen.queryByRole('link', { name: 'BAU3S vs 1Mha' })).not.toBeInTheDocument()
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

  it('opens the resource hub, opens its mobile menu and restores desktop navigation when resized', async () => {
    window.history.replaceState(null, '', '#home')
    render(<App />)
    fireEvent.click(screen.getByRole('link', { name: 'Khám phá Tài nguyên' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Tổng quan tài nguyên' })).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Mở menu' }))
    const dialog = screen.getByRole('dialog')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Tài nguyên' }))
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
