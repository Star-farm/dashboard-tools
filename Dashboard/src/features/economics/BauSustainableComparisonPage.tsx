import type { Language } from '../../i18n'
import data from '../../data/economics-bauss-series.json'
import type { Bau3Data } from './bau3Types'
import BauComparisonPage from './BauComparisonPage'

export default function BauSustainableComparisonPage({ language }: { language: Language }) {
  return <BauComparisonPage language={language} data={data as Bau3Data} />
}
