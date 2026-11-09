import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { Language } from '../../i18n'
import { categoryLabels, translations } from '../../i18n'
import csv from '../../data/indicators.csv?raw'
import { CATEGORIES, readIndicators, selectIndicators } from './glossaryData'
import type { CategoryFilter } from './glossaryData'
import '../../styles/page-help.css'

const indicators = readIndicators(csv)

export default function QuickGlossary({ language }: { language: Language }) {
  const dialog = useRef<HTMLDialogElement>(null), trigger = useRef<HTMLButtonElement>(null)
  const search = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false), [query, setQuery] = useState('')
  const [category, setCategory] = useState<CategoryFilter>('Tất cả')
  const id = useId(), t = translations[language], vi = language === 'vi'
  const title = vi ? 'Tra cứu thuật ngữ' : 'Look up terms'
  const visible = selectIndicators(indicators, query, category, true, language)
  useEffect(() => {
    if (!open) return
    search.current?.focus()
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = previous }
  }, [open])
  return <>
    <button ref={trigger} className="quick-glossary-trigger" type="button" aria-label={title} title={title} aria-haspopup="dialog" aria-controls={id} onClick={() => { dialog.current?.showModal(); search.current?.focus(); setOpen(true) }}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" /><path d="m15.5 15.5 5 5" /></svg></button>
    {createPortal(<dialog ref={dialog} id={id} className="quick-glossary" aria-labelledby={`${id}-title`} onClose={() => { setOpen(false); trigger.current?.focus({ preventScroll: true }) }} onClick={(event) => { if (event.target === event.currentTarget) dialog.current?.close() }}>
      {open && <div className="quick-glossary-panel">
        <header><h2 id={`${id}-title`}>{title}</h2><button type="button" aria-label={vi ? 'Đóng tra cứu' : 'Close lookup'} onClick={() => dialog.current?.close()}>×</button></header>
        <label htmlFor={`${id}-search`}>{t.search}</label>
        <input ref={search} id={`${id}-search`} type="search" title={t.search} placeholder={t.searchPlaceholder} value={query} onChange={(event) => setQuery(event.target.value)} />
        <fieldset className="quick-glossary-categories"><legend>{t.filterByTopic}</legend>
          {(['Tất cả', ...CATEGORIES] as CategoryFilter[]).map((item) => <button className={`category-button${category === item ? ' is-active' : ''}`} type="button" key={item} title={`${t.filterByTopic}: ${categoryLabels[language][item]}`} aria-pressed={category === item} onClick={() => setCategory(item)}>{categoryLabels[language][item]}<span className="category-count">{item === 'Tất cả' ? indicators.length : indicators.filter((indicator) => indicator.category === item).length}</span></button>)}
        </fieldset>
        <p role="status">{visible.length} / {indicators.length} {t.termsCount}</p>
        <div className="quick-glossary-results" tabIndex={0} aria-label={t.dictionary}>
          {CATEGORIES.map((group, index) => {
            const terms = visible.filter((indicator) => indicator.category === group)
            return terms.length > 0 && <section className="quick-glossary-group" key={group} aria-labelledby={`${id}-group-${index}`}>
              <h3 id={`${id}-group-${index}`}>{categoryLabels[language][group]} <small>({terms.length})</small></h3>
              {terms.map((indicator) => <article key={indicator.id}><h4>{vi ? indicator.name : indicator.englishName}</h4><p>{vi ? indicator.definition : indicator.englishDefinition}</p></article>)}
            </section>
          })}
          {!visible.length && <p>{t.emptyDescription}</p>}
        </div>
      </div>}
    </dialog>, document.body)}
  </>
}
