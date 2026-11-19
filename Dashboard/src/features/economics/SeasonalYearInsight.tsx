import type { Language } from '../../i18n'
import type { SeasonalFamily, SeasonalMetric } from './seasonalData'
import { seasonalText } from './seasonalText'
import { additiveSeasonalMetric, annualSeasonalValue } from './seasonalComposition'
import { seasonalChange } from './seasonalFormatting'

export default function SeasonalYearInsight({ language, metric, models, format, unit }: {
  language: Language
  metric: SeasonalMetric
  models: { family: SeasonalFamily; crops: { label: string; value: number | null }[] }[]
  format: (value: number) => string
  unit: string
}) {
  const t = seasonalText[language], vi = language === 'vi'
  const annualLabel = additiveSeasonalMetric(metric) ? t.annualTotal : t.annualMean
  const summaries = models.map((model) => ({ ...model, annual: annualSeasonalValue(model.crops.map((crop) => crop.value), metric) }))
  const first = summaries[0], second = summaries[1]
  const comparison = first?.annual != null && second?.annual != null ? {
    delta: second.annual - first.annual,
    tone: seasonalChange(first.annual, second.annual, metric, language).tone,
  } : null
  const gapUnit = ['roi', 'margin', 'awd'].includes(metric) ? vi ? 'điểm %' : 'pp' : unit
  return <div className="seasonal-crop-insights">
    <section className="seasonal-annual-summary"><h5>{annualLabel}</h5>
      {summaries.map((model) => <p key={model.family}>{t[model.family]}: <strong>{model.annual === null ? t.noData : `${format(model.annual)} ${unit}`}</strong>.</p>)}
      {comparison && <p>{t[second.family]} {Math.abs(comparison.delta) < .000001 ? vi ? 'bằng' : 'equals' : comparison.delta > 0 ? vi ? 'cao hơn' : 'is higher than' : vi ? 'thấp hơn' : 'is lower than'} {t[first.family]}{Math.abs(comparison.delta) < .000001 ? '' : <>: <strong className={`scenario-change ${comparison.tone}`}>{format(Math.abs(comparison.delta))} {gapUnit}</strong></>}.</p>}
    </section>
    {summaries.map((model) => <section className="seasonal-crop-detail" key={model.family}>
      <h5>{t[model.family]}</h5>
      <ul>{model.crops.map((crop) => <li key={crop.label}><strong>{crop.label}:</strong> {crop.value === null ? t.noData : `${format(crop.value)} ${unit}`}</li>)}</ul>
    </section>)}
  </div>
}
