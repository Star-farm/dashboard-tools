import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import App from '../src/app/App'
import HeaderNavigation from '../src/app/HeaderNavigation'

describe('current topic and missing pages', () => {
  it.each([false, true])('identifies exactly one current parent topic (mobile: %s)', (mobile) => {
    const { container, rerender } = render(<HeaderNavigation page="baussComparison" language="vi" mobile={mobile} />)
    expect(screen.getByRole('button', { name: 'Kinh tế' })).toHaveAttribute('aria-current', 'true')
    expect(container.querySelectorAll('.topic-trigger[aria-current="true"]')).toHaveLength(1)
    rerender(<HeaderNavigation page="resourceOneMha" language="en" mobile={mobile} />)
    expect(screen.getByRole('button', { name: 'Resources' })).toHaveAttribute('aria-current', 'true')
    rerender(<HeaderNavigation page="environmentExplore" language="en" mobile={mobile} />)
    expect(screen.getByRole('button', { name: 'Environment' })).toHaveAttribute('aria-current', 'true')
    rerender(<HeaderNavigation page="home" language="en" mobile={mobile} />)
    expect(container.querySelector('.topic-trigger[aria-current]')).not.toBeInTheDocument()
  })

  it('shows a bilingual 404 for unknown destinations and returns home', async () => {
    window.history.replaceState(null, '', '#missing-page')
    render(<App />)
    expect(screen.getByRole('heading', { level: 1, name: '404' })).toBeInTheDocument()
    expect(document.title).toBe('404 | STAR FARM')
    fireEvent.click(screen.getByRole('button', { name: 'English' }))
    expect(screen.getByText('The page you requested could not be found.')).toBeInTheDocument()
    fireEvent.click(within(screen.getByRole('main')).getByRole('link', { name: 'Return to home' }))
    expect(await screen.findByRole('heading', { name: /The impact of the/ })).toBeInTheDocument()
  })
})
