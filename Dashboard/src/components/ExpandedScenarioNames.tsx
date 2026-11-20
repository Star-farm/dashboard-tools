import { translations, type Language } from '../i18n'

const scenarioNamePattern = /1Mha|\bBAU\b|Thường lệ/gi

export default function ExpandedScenarioNames({ text, language }: { text: string; language: Language }) {
  const parts = []
  let cursor = 0
  for (const match of text.matchAll(scenarioNamePattern)) {
    const index = match.index ?? 0
    if (index > cursor) parts.push(text.slice(cursor, index))
    parts.push(/^1Mha$/i.test(match[0]) ? translations[language].fullOneMhaName : translations[language].fullBauName)
    cursor = index + match[0].length
  }
  if (cursor < text.length) parts.push(text.slice(cursor))
  return <>{parts.length ? parts : text}</>
}
