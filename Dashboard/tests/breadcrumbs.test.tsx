import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import App from '../src/app/App'
import { PageBreadcrumbs } from '../src/app/PageBreadcrumbs'
import type { Page } from '../src/app/usePageNavigation'
import { resourceRoutes } from '../src/features/resources/resourceRoutes'
import { environmentRoutes } from '../src/features/environment/environmentRoutes'

describe('page breadcrumbs', () => {
  it('shows the menu hierarchy in both languages and marks the current page', () => {
    const { rerender } = render(<PageBreadcrumbs page="economics" language="en" />)
    const breadcrumb = screen.getByRole('navigation', { name: 'Breadcrumb' })
    expect(within(breadcrumb).getAllByRole('listitem').map((item) => item.textContent?.replace('>', ''))).toEqual(['Home', 'Economics', 'Overview', 'Information dashboard'])
    expect(within(breadcrumb).getByRole('link', { name: 'Economics' })).toHaveAttribute('href', '#economics-explore')
    expect(within(breadcrumb).getByRole('link', { name: 'Overview' })).toHaveAttribute('href', '#economics-explore-overview')
    expect(within(breadcrumb).getByText('Information dashboard')).toHaveAttribute('aria-current', 'page')
    rerender(<PageBreadcrumbs page="economics" language="vi" />)
    expect(screen.getByRole('navigation', { name: 'Đường dẫn trang' })).toHaveTextContent('Trang chủ>Kinh tế>Tổng quan>Bảng thông tin')
  })

  it('provides a complete path for every content page without adding one to the home hero or 404', () => {
    const pages: Page[] = ['glossary', 'future', 'scenario', 'economicExplore', 'economics', 'economicComparison', 'bau3Comparison', 'bau2Comparison', 'baussComparison', 'bau3Farming', 'bau2Farming', 'baussFarming', 'oneMhaFarming', 'resourceExplore', 'environmentExplore', ...Object.keys(resourceRoutes) as (keyof typeof resourceRoutes)[], ...Object.keys(environmentRoutes) as (keyof typeof environmentRoutes)[]]
    const { container, rerender } = render(<PageBreadcrumbs page="home" language="en" />)
    expect(container).toBeEmptyDOMElement()
    for (const page of pages) {
      rerender(<PageBreadcrumbs page={page} language="en" />)
      const breadcrumb = screen.getByRole('navigation', { name: 'Breadcrumb' })
      expect(within(breadcrumb).getAllByRole('listitem')[0]).toHaveTextContent(/^Home$/)
      expect(within(breadcrumb).getByRole('link', { name: 'Home' })).toHaveAttribute('href', '#home')
      expect(breadcrumb.querySelector('[aria-current="page"]')?.textContent).toBeTruthy()
      expect(within(breadcrumb).getAllByRole('link').length).toBeGreaterThan(0)
    }
    rerender(<PageBreadcrumbs page="notFound" language="en" />)
    expect(container).toBeEmptyDOMElement()
  })

  it.each([
    ['economics-overview', 'Tổng quan', 'economics-explore-overview', 'Kinh tế'],
    ['resources-bau2-vs-1mha', 'So sánh', 'resources-explore-comparison', 'Tài nguyên'],
    ['environment-bauss', 'Canh tác như thường lệ', 'environment-explore-bau', 'Môi trường'],
  ])('opens the real parent section from #%s and keeps its destination links usable', async (anchor, branch, destination, topic) => {
    window.history.replaceState(null, '', `#${anchor}`)
    render(<App />)
    const breadcrumb = screen.getByRole('navigation', { name: 'Đường dẫn trang' })
    fireEvent.click(within(breadcrumb).getByRole('link', { name: branch }))
    const section = await screen.findByRole('region', { name: branch })
    expect(window.location.hash).toBe(`#${destination}`)
    expect(section).toHaveAttribute('id', destination)
    expect(screen.queryByRole('heading', { name: '404' })).not.toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Đường dẫn trang' }).querySelector('[aria-current="page"]')).toHaveTextContent(topic)
    const child = within(section).getAllByRole('link')[0]
    const childHash = child.getAttribute('href')
    fireEvent.click(child)
    await screen.findByRole('navigation', { name: 'Đường dẫn trang' })
    expect(window.location.hash).toBe(childHash)
  })
})
