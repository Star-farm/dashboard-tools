import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import csv from '../src/data/indicators.csv?raw'
import App from '../src/app/App'
import { CATEGORIES, parseCsv, readIndicators, selectIndicators } from '../src/features/glossary/glossaryData'

describe('CSV data', () => {
  it('reads all 31 terms with stable IDs and categories', () => {
    const indicators = readIndicators(csv)
    expect(indicators).toHaveLength(31)
    expect(indicators.map((item) => item.id)).toEqual(Array.from({ length: 31 }, (_, index) => String(index + 1)))
    expect(CATEGORIES.map((category) => indicators.filter((item) => item.category === category).length)).toEqual([5, 5, 2, 8, 11])
    expect(indicators.find((item) => item.id === '27')?.englishName).toContain('high-quality, low-emission')
    expect(indicators.find((item) => item.id === '21')?.definition).toContain('"Đề án một triệu héc-ta lúa (1Mha)"')
  })

  it('handles BOM, escaped quotes, comma, CRLF and multiline fields', () => {
    expect(parseCsv('\uFEFFname,definition\r\n"A, B","One ""quote""\nand two lines"\r\n')).toEqual([
      ['name', 'definition'], ['A, B', 'One "quote"\nand two lines'],
    ])
  })

  it('rejects broken files instead of silently showing wrong data', () => {
    expect(() => readIndicators('id,Name\n1,test')).toThrow()
    expect(() => parseCsv('name\n"unfinished')).toThrow()
  })

  it('searches without accents, matches English and combines category and query', () => {
    const indicators = readIndicators(csv)
    expect(selectIndicators(indicators, 'CUONG DO PHAT THAI', 'Tất cả', true).map((item) => item.id)).toEqual(['14'])
    expect(selectIndicators(indicators, 'methane emissions', 'Phát thải', true).map((item) => item.id)).toEqual(['14', '15'])
    expect(selectIndicators(indicators, 'thu nhap rong', 'Khí hậu', true)).toEqual([])
  })
})

describe('glossary interactions', () => {
  it('filters, combines a query and clears all filters from the empty state', () => {
    render(<App />)
    expect(screen.getByRole('status')).toHaveTextContent('31 / 31 thuật ngữ')
    fireEvent.click(screen.getByRole('button', { name: 'Kinh tế5' }))
    expect(screen.getByRole('status')).toHaveTextContent('5 / 31 thuật ngữ')
    fireEvent.change(screen.getByLabelText('Tìm thuật ngữ'), { target: { value: 'thu nhap rong' } })
    expect(screen.getByRole('status')).toHaveTextContent('1 / 31 thuật ngữ')
    expect(screen.getByRole('rowheader', { name: /Thu nhập ròng/ })).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Tìm thuật ngữ'), { target: { value: 'no-such-term' } })
    expect(screen.getByText('Chưa tìm thấy thuật ngữ')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Xem tất cả thuật ngữ' }))
    expect(screen.getByRole('status')).toHaveTextContent('31 / 31 thuật ngữ')
    expect(screen.getByLabelText('Tìm thuật ngữ')).toHaveValue('')
  })

  it('reverses table sorting and exposes the current order to assistive technology', () => {
    render(<App />)
    const table = screen.getByRole('table')
    const ascending = within(table).getAllByRole('rowheader').map((row) => row.textContent)
    fireEvent.click(screen.getByRole('button', { name: 'Sắp xếp tên giảm dần' }))
    expect(within(table).getAllByRole('rowheader').map((row) => row.textContent)).toEqual([...ascending].reverse())
    expect(screen.getByRole('columnheader', { name: /Tên thuật ngữ/ })).toHaveAttribute('aria-sort', 'descending')
  })
})
