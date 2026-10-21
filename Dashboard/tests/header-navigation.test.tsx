import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import HeaderNavigation from '../src/app/HeaderNavigation'

describe('header dropdown menus', () => {
  it('provides page links and the shared branches from the reference images', () => {
    render(<HeaderNavigation language="vi" page="home" />)
    const navigation = screen.getByRole('navigation', { name: 'Menu chính' })
    expect(within(navigation).getAllByRole('link').map((link) => link.textContent)).toEqual(['Trang chủ', 'Bảng định nghĩa', 'Về tương lai', 'Chi tiết kịch bản'])
    for (const label of ['Kinh tế', 'Tài nguyên', 'Môi trường']) {
      fireEvent.click(screen.getByRole('button', { name: label }))
      expect(screen.getByRole('button', { name: label })).toHaveAttribute('aria-expanded', 'true')
      const panel = screen.getByRole('list', { name: label })
      expect(within(panel).getByRole('button', { name: 'Tổng quan' })).toBeInTheDocument()
      expect(within(panel).getByRole('button', { name: 'So sánh' })).toBeInTheDocument()
      expect(within(panel).getByRole('button', { name: 'Canh tác như thường lệ' })).toBeInTheDocument()
      expect(within(panel).getByRole('button', { name: 'Một triệu hecta lúa' })).toHaveAttribute('aria-disabled', 'true')
    }
    fireEvent.mouseEnter(screen.getByRole('button', { name: 'Tổng quan' }))
    expect(screen.getByRole('button', { name: 'Bảng thông tin' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Bảng so sánh' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'So sánh' }))
    for (const name of ['BAU3S vs 1Mha', 'BAU2S vs 1Mha', 'BAUSS vs 1Mha']) expect(screen.getByRole('button', { name })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Canh tác như thường lệ' }))
    for (const name of ['3 mùa vụ', '2 mùa vụ', 'Bền vững']) expect(screen.getByRole('button', { name })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'BAU3S vs 1Mha' })).not.toBeInTheDocument()
  })

  it('supports keyboard navigation into nested menus and Escape returns focus one level at a time', async () => {
    render(<HeaderNavigation language="en" page="home" />)
    const trigger = screen.getByRole('button', { name: 'Economics' })
    fireEvent.keyDown(trigger, { key: 'ArrowDown' })
    const overview = screen.getByRole('button', { name: 'Overview' })
    await waitFor(() => expect(overview).toHaveFocus())
    fireEvent.keyDown(overview, { key: 'ArrowRight' })
    const information = screen.getByRole('button', { name: 'Information dashboard' })
    await waitFor(() => expect(information).toHaveFocus())
    fireEvent.keyDown(information, { key: 'ArrowDown' })
    const comparison = screen.getByRole('button', { name: 'Comparison dashboard' })
    expect(comparison).toHaveFocus()
    fireEvent.keyDown(comparison, { key: 'Escape' })
    expect(overview).toHaveFocus()
    expect(screen.queryByRole('button', { name: 'Information dashboard' })).not.toBeInTheDocument()
    fireEvent.keyDown(overview, { key: 'Escape' })
    expect(trigger).toHaveFocus()
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
  })

  it('closes menus on outside interaction and horizontal scrolling', () => {
    render(<HeaderNavigation language="en" page="home" />)
    const trigger = screen.getByRole('button', { name: 'Resources' })
    fireEvent.click(trigger)
    fireEvent.pointerDown(document.body)
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    fireEvent.mouseEnter(trigger)
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    fireEvent.scroll(trigger.closest('ul')!)
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
  })

  it('translates open menus and leaves destinations inactive while only the menu is being built', () => {
    const { rerender } = render(<HeaderNavigation language="vi" page="home" />)
    fireEvent.click(screen.getByRole('button', { name: 'Môi trường' }))
    fireEvent.click(screen.getByRole('button', { name: 'Canh tác như thường lệ' }))
    rerender(<HeaderNavigation language="en" page="home" />)
    expect(screen.getByRole('button', { name: 'Environment' })).toHaveAttribute('aria-expanded', 'true')
    const leaf = screen.getByRole('button', { name: '3 seasons' })
    expect(leaf).toHaveAttribute('aria-disabled', 'true')
    const hash = window.location.hash
    fireEvent.click(leaf)
    expect(window.location.hash).toBe(hash)
    expect(screen.getByRole('button', { name: '2 seasons' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sustainable' })).toBeInTheDocument()
  })
})
