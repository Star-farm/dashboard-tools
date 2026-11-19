const numericParts = /(?<![\p{L}\p{N}])([+−-]?\d+(?:[.,]\d+)*(?:[–—]\d+(?:[.,]\d+)*)?(?:\s?%)?)(?![\p{L}\p{N}])/gu

const modelNames = /1Mha|\bBAU(?:\s+(?:2|3)\s+(?:vụ|seasons)|\s+bền vững|\s+sustainable)?\b|Canh tác (?:như )?thường lệ(?: \d+ vụ)?|Business as usual(?: farming)?|Thường lệ/giu

import ExpandedScenarioNames from './ExpandedScenarioNames'

function limitSentences(text: string, maximum: number) {
  let count = 0
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index]
    if (character !== '.' && character !== '!' && character !== '?') continue
    if (character === '.' && /\d/.test(text[index - 1] ?? '') && /\d/.test(text[index + 1] ?? '')) continue
    if (index + 1 < text.length && !/\s|[”’"')\]]/.test(text[index + 1])) continue
    count += 1
    if (count === maximum) return text.slice(0, index + 1).trim()
  }
  return text
}

export default function EmphasizedNumbers({ text, maxSentences }: { text: string; maxSentences?: number }) {
  const displayText = maxSentences ? limitSentences(text, maxSentences) : text
  const parts: { text: string; model?: 'bau' | 'one-mha' }[] = []
  let cursor = 0
  for (const match of displayText.matchAll(modelNames)) {
    const index = match.index ?? 0
    if (index > cursor) parts.push({ text: displayText.slice(cursor, index) })
    parts.push({ text: match[0], model: /^1mha$/i.test(match[0]) ? 'one-mha' : 'bau' })
    cursor = index + match[0].length
  }
  if (!parts.length) parts.push({ text: displayText })
  else if (cursor < displayText.length) parts.push({ text: displayText.slice(cursor) })

  const language = document.documentElement.lang === 'vi' ? 'vi' : 'en'
  return parts.map(({ text: part, model }, index) => model
    ? <strong key={index} className="scenario-insight-model"><ExpandedScenarioNames text={part} language={language} /></strong>
    : part.split(numericParts).map((segment, numberIndex) => numberIndex % 2 ? <strong key={`${index}-${numberIndex}`}>{segment}</strong> : segment))
}

