import type { Language } from '../../i18n'
import data from '../../data/economics-bau2-series.json'
import type { Bau3Data } from './bau3Types'
import BauComparisonPage from './BauComparisonPage'

export default function Bau2ComparisonPage({ language }: { language: Language }) {
  return <BauComparisonPage language={language} data={data as Bau3Data} />
}
