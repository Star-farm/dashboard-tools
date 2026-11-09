import { lazy, Suspense, useState } from 'react'
import type { ReactNode } from 'react'
import type { Language } from '../i18n'
import type { SeasonalConfig, PackedSeasonalData } from '../features/economics/seasonalData'
import { cropPeriods } from '../features/economics/seasonalData'
import { seasonalText } from '../features/economics/seasonalText'
import { mapDestination, readMapContext } from '../app/mapNavigation'
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
  const context = readMapContext()
  const [seasonal, setSeasonal] = useState(() => !!context?.harvest || new URLSearchParams(window.location.search).get('view') === 'seasonal')
  const View = views[config.topic]
  return <>
    {context && <div className="dashboard-map-context"><span>{language === 'vi' ? 'Từ bản đồ' : 'From map'} · {context.year}{context.harvest > 0 ? ` · ${seasonalText[language][cropPeriods[context.harvest - 1]]}` : ''}</span><a href={mapDestination('#map', context)}>{language === 'vi' ? 'Trở lại bản đồ' : 'Back to map'} →</a></div>}
    <div className="analysis-view-switch" role="group" aria-label={language === 'vi' ? 'Phạm vi phân tích' : 'Analysis scope'}>
      <h2 className="filter-group-title">{language === 'vi' ? 'Phạm vi phân tích' : 'Analysis scope'}</h2>
      <button type="button" title={language === 'vi' ? 'Trung bình năm' : 'Annual averages'} aria-pressed={!seasonal} onClick={() => setSeasonal(false)}>{language === 'vi' ? 'Trung bình năm' : 'Annual averages'}</button>
      <button type="button" title={language === 'vi' ? 'Theo từng vụ' : 'By crop season'} aria-pressed={seasonal} onClick={() => setSeasonal(true)}>{language === 'vi' ? 'Theo từng vụ' : 'By crop season'}</button>
    </div>
    {seasonal ? <Suspense fallback={<p role="status">{language === 'vi' ? 'Đang tải dữ liệu theo vụ…' : 'Loading seasonal data…'}</p>}><View key={config.scenarioCode ?? config.family ?? config.kind} language={language} config={config} /></Suspense> : children}
  </>
}
