import { translations, type Language } from '../i18n'
import indicatorsCsv from '../data/indicators.csv?raw'
import { readIndicators } from '../features/glossary/glossaryData'
import { useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

const abbreviationPattern = /1Mha|Canh tác (?:như )?thường lệ|Thường lệ|Business as usual(?: farming)?|BAU(?=\b|\d)/gi
const glossaryIndicators = readIndicators(indicatorsCsv)
const glossaryDefinitions = {
  bau: glossaryIndicators.find(({ englishName }) => englishName.includes('(BAU)')),
  oneMha: glossaryIndicators.find(({ englishName }) => englishName.includes('(1Mha)')),
}

function ScenarioAbbreviation({ term, definition }: { term: string; definition: string }) {
  const [pointer, setPointer] = useState<{ x: number; y: number }>()
  const popupRef = useRef<HTMLSpanElement>(null)
  const [position, setPosition] = useState<{ left: number; top: number }>()

  useLayoutEffect(() => {
    if (!pointer || !popupRef.current) return
    const bounds = popupRef.current.getBoundingClientRect()
    const right = pointer.x + 14
    const left = right + bounds.width <= window.innerWidth - 8 ? right : pointer.x - bounds.width - 14
    const top = pointer.y + 14 + bounds.height <= window.innerHeight - 8 ? pointer.y + 14 : pointer.y - bounds.height - 14
    setPosition({
      left: Math.max(8, Math.min(left, window.innerWidth - bounds.width - 8)),
      top: Math.max(8, Math.min(top, window.innerHeight - bounds.height - 8)),
    })
  }, [pointer])

  const popup = pointer && createPortal(
    <span ref={popupRef} className="scenario-abbreviation-popup" role="tooltip" style={{ left: position?.left ?? pointer.x + 14, top: position?.top ?? pointer.y + 14 }}>
      {definition}
    </span>,
    document.body,
  )

  return <>
    <abbr className="scenario-abbreviation" aria-label={`${term}: ${definition}`} tabIndex={0}
      onPointerEnter={(event) => { if (event.pointerType === 'mouse') setPointer({ x: event.clientX, y: event.clientY }) }}
      onPointerMove={(event) => { if (event.pointerType === 'mouse') setPointer({ x: event.clientX, y: event.clientY }) }}
      onPointerLeave={() => setPointer(undefined)}
      onFocus={(event) => { const rect = event.currentTarget.getBoundingClientRect(); setPointer({ x: rect.right, y: rect.top + rect.height / 2 }) }}
      onBlur={() => setPointer(undefined)}>{term}</abbr>
    {popup}
  </>
}

export default function ScenarioAbbreviations({ text, language }: { text: string; language: Language }) {
  const parts = []
  let cursor = 0
  for (const match of text.matchAll(abbreviationPattern)) {
    const index = match.index ?? 0
    if (index > cursor) parts.push(text.slice(cursor, index))
    const term = match[0]
    const isOneMha = /^1Mha$/i.test(term)
    const indicator = isOneMha ? glossaryDefinitions.oneMha : glossaryDefinitions.bau
    const definition = indicator
      ? language === 'vi' ? indicator.definition : indicator.englishDefinition
      : isOneMha ? translations[language].abbrOneMhaDefinition : translations[language].abbrBauDefinition
    parts.push(<ScenarioAbbreviation key={`${index}-${term}`} term={term} definition={definition} />)
    cursor = index + term.length
  }
  if (cursor < text.length) parts.push(text.slice(cursor))
  return <>{parts.length ? parts : text}</>
}
