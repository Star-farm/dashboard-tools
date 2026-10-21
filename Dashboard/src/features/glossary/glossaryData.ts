import { parseCsv } from '../../utils/csv'
export { parseCsv } from '../../utils/csv'
import { categoryLabels } from '../../i18n'
import type { Language } from '../../i18n'

export const CATEGORIES = ['Kinh tế', 'Khí hậu', 'Phát thải', 'Canh tác', 'Kịch bản'] as const
export type Category = typeof CATEGORIES[number]
export type CategoryFilter = 'Tất cả' | Category

export interface Indicator {
  id: string
  name: string
  englishName: string
  definition: string
  englishDefinition: string
  category: Category
}

export function readIndicators(source: string): Indicator[] {
  const [headers, ...rows] = parseCsv(source)
  const required = ['id', 'Name', 'Definition', 'Tên kịch bản', 'Phân loại', 'Định nghĩa']
  if (!headers || required.some((header) => !headers.includes(header))) {
    throw new Error('CSV is missing required indicator columns.')
  }
  const ids = new Set<string>()
  return rows.map((row) => {
    const cell = (header: string) => row[headers.indexOf(header)]?.trim() ?? ''
    const id = cell('id')
    const category = cell('Phân loại') as Category
    if (row.length !== headers.length || !id || ids.has(id) || !cell('Tên kịch bản') || !cell('Định nghĩa') || !cell('Name') || !cell('Definition') || !CATEGORIES.includes(category)) {
      throw new Error('CSV contains an invalid or duplicate indicator.')
    }
    ids.add(id)
    return {
      id,
      name: cell('Tên kịch bản'),
      englishName: cell('Name'),
      definition: cell('Định nghĩa'),
      englishDefinition: cell('Definition'),
      category,
    }
  })
}

export function normalizeSearch(value: string): string {
  return value.normalize('NFD').replace(/\p{M}/gu, '').replace(/[đĐ]/g, 'd').toLocaleLowerCase('vi').replace(/\s+/g, ' ').trim()
}

export function selectIndicators(indicators: Indicator[], query: string, category: CategoryFilter, ascending: boolean, language: Language = 'vi'): Indicator[] {
  const words = normalizeSearch(query).split(' ').filter(Boolean)
  return indicators
    .filter((indicator) => {
      if (category !== 'Tất cả' && indicator.category !== category) return false
      const text = normalizeSearch([indicator.name, indicator.englishName, indicator.definition, indicator.englishDefinition, indicator.category, categoryLabels.en[indicator.category]].join(' '))
      return words.every((word) => text.includes(word))
    })
    .sort((a, b) => {
      const first = language === 'vi' ? a.name : a.englishName
      const second = language === 'vi' ? b.name : b.englishName
      return (ascending ? 1 : -1) * first.localeCompare(second, language)
    })
}
