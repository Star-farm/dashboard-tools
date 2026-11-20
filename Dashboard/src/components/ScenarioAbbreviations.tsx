import { translations, type Language } from '../i18n'
import indicatorsCsv from '../data/indicators.csv?raw'
import { readIndicators } from '../features/glossary/glossaryData'

const abbreviationPattern = /1Mha|Canh tác (?:như )?thường lệ|Thường lệ|Business as usual(?: farming)?|BAU(?=\b|\d)/gi
const glossaryIndicators = readIndicators(indicatorsCsv)
const glossaryDefinitions = {
  bau: glossaryIndicators.find(({ englishName }) => englishName.includes('(BAU)')),
  oneMha: glossaryIndicators.find(({ englishName }) => englishName.includes('(1Mha)')),
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
    parts.push(<abbr className="scenario-abbreviation" key={`${index}-${term}`} aria-label={`${term}: ${definition}`} data-definition={definition} tabIndex={0}>{term}</abbr>)
    cursor = index + term.length
  }
  if (cursor < text.length) parts.push(text.slice(cursor))
  return <>{parts.length ? parts : text}</>
}
