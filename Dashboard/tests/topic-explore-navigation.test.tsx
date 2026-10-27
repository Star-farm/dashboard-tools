import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import HeaderNavigation from '../src/app/HeaderNavigation'
import App from '../src/app/App'

const topics = [
  { vi: 'Kinh tế', en: 'Economics', prefix: 'economics', viTitle: 'Khám phá Kinh tế', enTitle: 'Explore economics' },
  { vi: 'Tài nguyên', en: 'Resources', prefix: 'resources', viTitle: 'Khám phá Tài nguyên', enTitle: 'Explore resources' },
  { vi: 'Môi trường', en: 'Environment', prefix: 'environment', viTitle: 'Khám phá Môi trường', enTitle: 'Explore the environment' },
]

describe('topic names open exploration pages', () => {
  it.each([false, true].flatMap((mobile) => (['vi', 'en'] as const).map((language) => ({ mobile, language }))))('keeps links and dropdown controls separate ($language, mobile: $mobile)', ({ mobile, language }) => {
    const navigate = vi.fn()
    render(<HeaderNavigation page="home" language={language} mobile={mobile} onNavigate={navigate} />)
    for (const topic of topics) {
      const toggle = screen.getByRole('button', { name: topic[language] })
      const link = screen.getByRole('link', { name: topic[language] })
      expect(link).toHaveAttribute('href', `#${topic.prefix}-explore`)
      fireEvent.click(toggle)
      expect(toggle).toHaveAttribute('aria-expanded', 'true')
      expect(screen.getByRole('link', { name: language === 'vi' ? 'Tổng quan' : 'Overview' })).toBeInTheDocument()
      fireEvent.click(link)
      expect(toggle).toHaveAttribute('aria-expanded', 'false')
    }
    expect(navigate).toHaveBeenCalledTimes(3)
  })

  it.each(topics)('navigates from the header into $en exploration', async (topic) => {
    window.history.replaceState(null, '', '#home')
    render(<App />)
    const navigation = screen.getByRole('navigation', { name: 'Menu chính' })
    fireEvent.click(within(navigation).getByRole('link', { name: topic.vi }))
    expect(await screen.findByRole('heading', { level: 1, name: topic.viTitle })).toBeInTheDocument()
    expect(window.location.hash).toBe(`#${topic.prefix}-explore`)
    expect(document.querySelectorAll('.economic-explore-card')).toHaveLength(4)
    fireEvent.click(screen.getByRole('button', { name: 'English' }))
    expect(screen.getByRole('heading', { level: 1, name: topic.enTitle })).toBeInTheDocument()
    expect(within(screen.getByRole('navigation', { name: 'Main menu' })).getByRole('link', { name: topic.en })).toHaveAttribute('href', `#${topic.prefix}-explore`)
  })
})
