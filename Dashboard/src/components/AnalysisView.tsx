import { lazy, Suspense, useState } from 'react'
import type { ReactNode } from 'react'
import type { Language } from '../i18n'
import type { SeasonalConfig, PackedSeasonalData } from '../features/economics/seasonalData'
import '../styles/analysis-view.css'

type Props = { language: Language; config: SeasonalConfig; children: ReactNode }
function loadView(loadData: () => Promise<{ default: unknown }>) {
  return lazy(async () => {
    const [{ default: View }, { default: packed }, { unpackSeasonalData }] = await Promise.all([import('../features/economics/SeasonalComparison'), loadData(), import('../features/economics/seasonalData')])
    const data = unpackSeasonalData(packed as PackedSeasonalData)
    return { default: (props: Pick<Props, 'language' | 'config'>) => <View {...props} data={data} /> }
  })
}
const views = {
  economics: loadView(() => import('../data/economics-seasonal.json')),
  resources: loadView(() => import('../data/resources-seasonal.json')),
  environment: loadView(() => import('../data/environment-seasonal.json')),
  all: loadView(() => import('../data/all-seasonal.json')),
}

export default function AnalysisView({ language, config, children }: Props) {
  const [seasonal, setSeasonal] = useState(() => new URLSearchParams(window.location.search).get('view') === 'seasonal')
  const View = views[config.topic]
  return <>
    <div className="analysis-view-switch" role="group" aria-label={language === 'vi' ? 'Phạm vi phân tích' : 'Analysis scope'}>
      <button type="button" aria-pressed={!seasonal} onClick={() => setSeasonal(false)}>{language === 'vi' ? 'Trung bình năm' : 'Annual averages'}</button>
      <button type="button" aria-pressed={seasonal} onClick={() => setSeasonal(true)}>{language === 'vi' ? 'Theo từng vụ' : 'By crop season'}</button>
    </div>
    {seasonal ? <Suspense fallback={<p role="status">{language === 'vi' ? 'Đang tải dữ liệu theo vụ…' : 'Loading seasonal data…'}</p>}><View key={config.scenarioCode ?? config.family ?? config.kind} language={language} config={config} /></Suspense> : children}
  </>
}
