import type { Language } from '../../i18n'
import data from '../../data/economics-bau3-series.json'
import type { Bau3Data } from './bau3Types'
import FarmingPage from './FarmingPage'

export default function Bau3FarmingPage({ language }: { language: Language }) {
  return <FarmingPage language={language} data={data as Bau3Data} family="bau3s" />
}
