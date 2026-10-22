import { useMemo, useState } from 'react'
import csv from '../../data/indicators.csv?raw'
import { CATEGORIES, readIndicators, selectIndicators } from './glossaryData'
import type { CategoryFilter } from './glossaryData'
import { categoryLabels, translations } from '../../i18n'
import type { Language } from '../../i18n'

export default function Glossary({ language }: { language: Language }) {
  const t = translations[language]
  const [indicators] = useState(() => readIndicators(csv))
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<CategoryFilter>('Tất cả')
  const [ascending, setAscending] = useState(true)
  const visible = useMemo(() => selectIndicators(indicators, query, category, ascending, language), [indicators, query, category, ascending, language])
  const categories: CategoryFilter[] = ['Tất cả', ...CATEGORIES]

  function resetFilters() {
    setQuery('')
    setCategory('Tất cả')
  }

  return (
      <div className="page-shell glossary-page" id="glossary">
        <section className="intro" aria-labelledby="page-title">
          <h1 id="page-title">{t.title}</h1>
        </section>

        <section className="dictionary" id="search-panel" aria-label={t.dictionary}>
          <div className="search-area">
            <label htmlFor="term-search">{t.search}</label>
            <div className="search-field">
              <span className="search-icon" aria-hidden="true" />
              <input id="term-search" type="search" placeholder={t.searchPlaceholder} value={query} onChange={(event) => setQuery(event.target.value)} />
              {query && <button type="button" className="clear-search" onClick={() => setQuery('')} aria-label={t.clearSearch}>{t.clear}</button>}
            </div>
          </div>

          <div className="category-filters" role="group" aria-label={t.filterByTopic}>
            {categories.map((item) => (
              <button className={`category-button${category === item ? ' is-active' : ''}`} key={item} type="button" aria-pressed={category === item} onClick={() => setCategory(item)}>
                {categoryLabels[language][item]}<span className="category-count">{item === 'Tất cả' ? indicators.length : indicators.filter((indicator) => indicator.category === item).length}</span>
              </button>
            ))}
          </div>

          <div className="results-toolbar">
            <p className="results-count" role="status" aria-live="polite" aria-atomic="true"><strong>{visible.length}</strong> / {indicators.length} {t.termsCount}<span className="selected-category">{category === 'Tất cả' ? t.allTopics : categoryLabels[language][category]}</span></p>
            <button type="button" className="mobile-sort" onClick={() => setAscending(!ascending)}>{t.sortName} {ascending ? 'A → Z' : 'Z → A'}</button>
            {(query || category !== 'Tất cả') && <button className="reset-filters" onClick={resetFilters}>{t.resetFilters}</button>}
          </div>

          <div className="table-container" id="definitions" tabIndex={-1}>
            <table className="definitions-table">
              <caption className="sr-only">{t.tableCaption}</caption>
              <colgroup><col className="term-column" /><col /></colgroup>
              <thead>
                <tr>
                  <th scope="col" aria-sort={ascending ? 'ascending' : 'descending'}><button className="sort-button" onClick={() => setAscending(!ascending)} aria-label={ascending ? t.sortDescending : t.sortAscending}>{t.termName}<span className={`sort-arrow${ascending ? '' : ' descending'}`} aria-hidden="true" /></button></th>
                  <th scope="col">{t.definition}</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((indicator) => (
                  <tr key={indicator.id}>
                    <th scope="row"><span className="term-name">{language === 'vi' ? indicator.name : indicator.englishName}</span><span className="term-category">{categoryLabels[language][indicator.category]}</span></th>
                    <td>{language === 'vi' ? indicator.definition : indicator.englishDefinition}</td>
                  </tr>
                ))}
                {visible.length === 0 && <tr className="empty-row"><td colSpan={2}><div className="empty-state"><span className="empty-decoration" aria-hidden="true">?</span><h2>{t.emptyTitle}</h2><p>{t.emptyDescription}</p><button className="primary-button" onClick={resetFilters}>{t.viewAll}</button></div></td></tr>}
              </tbody>
            </table>
          </div>
          <footer className="dictionary-footer"><span>{indicators.length} {t.termsCount} · {CATEGORIES.length} {t.topicsCount}</span></footer>
        </section>
      </div>
  )
}
