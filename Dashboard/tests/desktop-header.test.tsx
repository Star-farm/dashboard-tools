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

  it('uses the solid page header color after scrolling past the home hero', () => {
    render(<SiteHeader language="vi" page="home" changeLanguage={() => {}} />)
    const header = screen.getByRole('banner')
    expect(header).not.toHaveClass('header-home-scrolled')
    scrollTo(700)
    expect(header).toHaveClass('header-home-scrolled')
    scrollTo(0)
    expect(header).not.toHaveClass('header-home-scrolled')
  })

  it('keeps a content page header solid while scrolling and navigating by keyboard', () => {
    render(<SiteHeader language="en" page="future" changeLanguage={() => {}} />)
    const header = screen.getByRole('banner')
    expect(header).not.toHaveClass('header-home')
    scrollTo(300)
    expect(header).not.toHaveClass('header-home')
    scrollTo(400)
    fireEvent(window, new HashChangeEvent('hashchange'))
    expect(within(header).getByRole('link', { name: 'About the future' })).toHaveAttribute('aria-current', 'page')
  })
})
