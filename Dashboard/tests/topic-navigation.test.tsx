import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import HeaderNavigation from '../src/app/HeaderNavigation'

const topics = [
  { vi: 'Kinh tế', en: 'Economics' },
  { vi: 'Tài nguyên', en: 'Resources' },
  { vi: 'Môi trường', en: 'Environment' },
]

describe('nested topic navigation', () => {
  it.each([false, true].flatMap((mobile) => (['vi', 'en'] as const).map((language) => ({ mobile, language }))))(
    'opens each topic and branch without navigating ($language, mobile: $mobile)',
    ({ mobile, language }) => {
      const navigate = vi.fn()
      window.history.replaceState(null, '', '#home')
      render(<HeaderNavigation page="home" language={language} mobile={mobile} onNavigate={navigate} />)

      for (const topic of topics) {
        const trigger = screen.getByRole('button', { name: topic[language] })
        fireEvent.click(trigger)
        expect(trigger).toHaveAttribute('aria-expanded', 'true')
        expect(window.location.hash).toBe('#home')

        const overview = screen.getByRole('button', { name: language === 'vi' ? 'Tổng quan' : 'Overview' })
        fireEvent.click(overview)
        expect(overview).toHaveAttribute('aria-expanded', 'true')
        expect(screen.getByRole('link', { name: language === 'vi' ? 'Bảng thông tin' : 'Information dashboard' })).toBeInTheDocument()
        expect(window.location.hash).toBe('#home')
        expect(navigate).not.toHaveBeenCalled()
      }
    },
  )
})
