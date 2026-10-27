import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import App from '../src/app/App'
import HeaderNavigation from '../src/app/HeaderNavigation'

const topics = [
  { prefix: 'economics', vi: 'Kinh tế', en: 'Economics' },
  { prefix: 'resources', vi: 'Tài nguyên', en: 'Resources' },
  { prefix: 'environment', vi: 'Môi trường', en: 'Environment' },
]
const branches = [
  { id: 'overview', vi: 'Tổng quan', en: 'Overview', count: 2 },
  { id: 'comparison', vi: 'So sánh', en: 'Comparison', count: 3 },
  { id: 'bau', vi: 'Canh tác như thường lệ', en: 'Business as usual', count: 3 },
]

describe('separate exploration branch pages', () => {
  it.each(topics.flatMap((topic) => branches.map((branch) => ({ topic, branch }))))('opens $topic.prefix/$branch.id as its own bilingual page', async ({ topic, branch }) => {
    window.history.replaceState(null, '', `#${topic.prefix}-explore-${branch.id}`)
    render(<App />)
    expect(await screen.findByRole('heading', { level: 1, name: branch.vi })).toBeInTheDocument()
    const content = screen.getByRole('region', { name: branch.vi })
    expect(content.querySelectorAll('.explore-destination-card')).toHaveLength(branch.count)
    expect(document.querySelector('.economic-explore-grid')).not.toBeInTheDocument()
    expect(document.title).toBe(`${branch.vi} · ${topic.vi} | STAR FARM`)
    const breadcrumb = screen.getByRole('navigation', { name: 'Đường dẫn trang' })
    expect(breadcrumb.querySelector('[aria-current="page"]')).toHaveTextContent(branch.vi)
    expect(within(breadcrumb).getByRole('link', { name: topic.vi })).toHaveAttribute('href', `#${topic.prefix}-explore`)
    fireEvent.click(screen.getByRole('button', { name: 'English' }))
    expect(screen.getByRole('heading', { level: 1, name: branch.en })).toBeInTheDocument()
    expect(document.title).toBe(`${branch.en} · ${topic.en} | STAR FARM`)
    fireEvent.click(within(screen.getByRole('navigation', { name: 'Breadcrumb' })).getByRole('link', { name: topic.en }))
    expect(await screen.findByRole('heading', { level: 1, name: /Explore/ })).toBeInTheDocument()
    expect(document.querySelectorAll('.economic-explore-card')).toHaveLength(4)
    expect(document.querySelector('.explore-destinations')).not.toBeInTheDocument()
    fireEvent.click(within(screen.getByRole('main')).getByRole('link', { name: branch.en }))
    expect(await screen.findByRole('heading', { level: 1, name: branch.en })).toBeInTheDocument()
    expect(window.location.hash).toBe(`#${topic.prefix}-explore-${branch.id}`)
  })

  it.each([false, true])('separates branch navigation from submenu expansion (mobile: %s)', (mobile) => {
    const navigate = vi.fn()
    render(<HeaderNavigation page="home" language="en" mobile={mobile} onNavigate={navigate} />)
    fireEvent.click(screen.getByRole('button', { name: 'Economics' }))
    const overview = screen.getByRole('link', { name: 'Overview' })
    const toggle = screen.getByRole('button', { name: 'Overview' })
    expect(overview).toHaveAttribute('href', '#economics-explore-overview')
    fireEvent.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('link', { name: 'Information dashboard' })).toHaveAttribute('href', '#economics-overview')
    expect(navigate).not.toHaveBeenCalled()
    if (mobile) {
      fireEvent.click(toggle)
      expect(toggle).toHaveAttribute('aria-expanded', 'false')
    }
    fireEvent.click(overview)
    expect(navigate).toHaveBeenCalledOnce()
    expect(screen.getByRole('button', { name: 'Economics' })).toHaveAttribute('aria-expanded', 'false')
  })

  it('preserves the branch when skipping to the main content', async () => {
    window.history.replaceState(null, '', '#economics-explore-overview')
    render(<App />)
    expect(await screen.findByRole('heading', { level: 1, name: 'Tổng quan' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('link', { name: 'Đến nội dung chính' }))
    await waitFor(() => expect(window.location.hash).toBe('#main-content'))
    expect(await screen.findByRole('heading', { level: 1, name: 'Tổng quan' })).toBeInTheDocument()
    expect(document.querySelectorAll('.explore-destination-card')).toHaveLength(2)
  })
})
