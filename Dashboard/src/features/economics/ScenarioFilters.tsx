import type { Language } from '../../i18n'
import type { EconomicFilters, EconomicRow } from './economicsData'
import { economicFacets, economicsText } from './economicsText'

type Props = {
  rows: readonly Pick<EconomicRow, keyof EconomicFilters>[]
  filters: EconomicFilters
  onChange: (filters: EconomicFilters) => void
  language: Language
  idPrefix: string
  seasonLabel?: string
}

export default function ScenarioFilters({ rows, filters, onChange, language, idPrefix, seasonLabel }: Props) {
  const t = economicsText[language]
  const availableValues = (index: number, selections: EconomicFilters): Set<string> => {
    const preceding = economicFacets.slice(0, index)
    return new Set(rows.filter((row) => preceding.every(({ key }) => selections[key] === 'all' || row[key] === selections[key])).map((row) => row[economicFacets[index].key]))
  }
  const changeFilter = (index: number, value: string) => {
    const next = { ...filters, [economicFacets[index].key]: value }
    for (let following = index + 1; following < economicFacets.length; following++) {
      const { key } = economicFacets[following]
      next[key] = 'all'
    }
    onChange(next)
  }
  return <form className="economic-filters" aria-label={t.filters} onSubmit={(event) => event.preventDefault()}>
    {economicFacets.map(({ key, options }, index) => {
      const available = availableValues(index, filters)
      const id = `${idPrefix}-${key}`
      return <div className="economic-filter" key={key}>
        <label htmlFor={id}>{key === 'season' && seasonLabel ? seasonLabel : t[key]}</label>
        <div className="economic-select-control">
          <span className="economic-selected-label" aria-hidden="true">{filters[key] === 'all' ? t.all : t[filters[key] as keyof typeof t]}</span>
          <select id={id} value={filters[key]} onChange={(event) => changeFilter(index, event.target.value)}>
            <option value="all">{t.all}</option>
            {options.filter((option) => available.has(option)).map((option) => <option key={option} value={option}>{t[option]}</option>)}
          </select>
        </div>
      </div>
    })}
  </form>
}
