import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import SiteHeader from '../src/app/SiteHeader'

describe('desktop header scrolling', () => {
  beforeEach(() => {
    vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} }))
    vi.spyOn(window, 'scrollY', 'get').mockReturnValue(0)
  })
  afterEach(() => vi.unstubAllGlobals())

  function scrollTo(y: number) {
    vi.spyOn(window, 'scrollY', 'get').mockReturnValue(y)
    fireEvent.scroll(window)
  }

  it('hides when scrolling down, ignores slight movement, and appears when scrolling up or reaching the top', () => {
    render(<SiteHeader language="vi" page="home" changeLanguage={() => {}} />)
    const header = screen.getByRole('banner')
    expect(header).not.toHaveClass('header-hidden')
    scrollTo(140)
    expect(header).toHaveClass('header-hidden')
    scrollTo(138)
    expect(header).toHaveClass('header-hidden')
    scrollTo(120)
    expect(header).not.toHaveClass('header-hidden')
    scrollTo(180)
    expect(header).toHaveClass('header-hidden')
    scrollTo(0)
    expect(header).not.toHaveClass('header-hidden')
  })

  it('shows the header when navigating or focusing a menu item from the keyboard', () => {
    render(<SiteHeader language="en" page="future" changeLanguage={() => {}} />)
    const header = screen.getByRole('banner')
    scrollTo(300)
    fireEvent.focus(screen.getByRole('button', { name: 'English' }))
    expect(header).not.toHaveClass('header-hidden')
    scrollTo(400)
    expect(header).toHaveClass('header-hidden')
    fireEvent(window, new HashChangeEvent('hashchange'))
    expect(header).not.toHaveClass('header-hidden')
    expect(within(header).getByRole('link', { name: 'About future' })).toHaveAttribute('aria-current', 'page')
  })
})
