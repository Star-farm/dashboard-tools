import type { Language } from '../../i18n'
import EmphasizedNumbers from '../../components/EmphasizedNumbers'
import type { SeasonalFamily, SeasonalMetric } from './seasonalData'
import { seasonalChange, seasonalUnit } from './seasonalFormatting'
import { seasonalText } from './seasonalText'

export default function SeasonalTrendInsight({ language, metric, models, startYear, endYear }: {
  language: Language
  metric: SeasonalMetric
  models: { family: SeasonalFamily; values: { year: number; value: number | null }[] }[]
  startYear: number
  endYear: number
}) {
  const t = seasonalText[language]

  if (!models.length) return <p>{t.noPair}</p>

  if (metric === 'roi' && models.length === 2 && models.some((model) => model.family === 'oneMha')) {
    const oneMha = models.find((model) => model.family === 'oneMha')!
    const bau = models.find((model) => model.family !== 'oneMha')!
    const range = (model: typeof oneMha) => model.values
      .filter((point) => point.year >= startYear && point.year <= endYear && point.value !== null)
      .map((point) => point.value!)
    const oneMhaValues = range(oneMha), bauValues = range(bau)
    if (oneMhaValues.length && bauValues.length) {
      const number = new Intl.NumberFormat(language, { maximumFractionDigits: 1 })
      const bounds = (values: number[]) => `${number.format(Math.min(...values))}–${number.format(Math.max(...values))}%`
      const firstOne = oneMha.values.find((point) => point.value !== null && point.year >= startYear && point.year <= endYear)
      const lastOne = [...oneMha.values].reverse().find((point) => point.value !== null && point.year >= startYear && point.year <= endYear)
      const firstBau = bau.values.find((point) => point.value !== null && point.year >= startYear && point.year <= endYear)
      const lastBau = [...bau.values].reverse().find((point) => point.value !== null && point.year >= startYear && point.year <= endYear)
      const changeText = (first: number, last: number) => seasonalChange(first, last, metric, language).text
      const paired = oneMha.values.flatMap((point) => {
        const comparison = bau.values.find((item) => item.year === point.year)
        return point.value === null || comparison?.value == null ? [] : [{ year: point.year, gap: point.value - comparison.value }]
      })
      const firstGap = paired[0]?.gap, lastGap = paired.at(-1)?.gap
      const higherCount = paired.filter((point) => point.gap > 0).length
      const higherAllYears = paired.length > 0 && higherCount === paired.length
      const gapText = firstGap === undefined || lastGap === undefined ? '' : language === 'vi'
        ? `Khoảng cách ${firstGap <= lastGap ? 'tăng' : 'giảm'} từ ${number.format(Math.abs(firstGap))} lên ${number.format(Math.abs(lastGap))} điểm phần trăm.`
        : `The gap ${firstGap <= lastGap ? 'widened' : 'narrowed'} from ${number.format(Math.abs(firstGap))} to ${number.format(Math.abs(lastGap))} percentage points.`
      const relativeLabel = higherAllYears ? 'luôn cao hơn' : higherCount > paired.length / 2 ? 'cao hơn trong phần lớn số năm' : 'có mức ROI so sánh được với'
      const text = language === 'vi'
        ? `Trong giai đoạn ${startYear}–${endYear}, ROI của ${t.oneMha} ${relativeLabel} ${t[bau.family]}, dao động ${bounds(oneMhaValues)}; BAU dao động ${bounds(bauValues)}. ROI 1Mha ${firstOne && lastOne ? `${changeText(firstOne.value!, lastOne.value!)} (từ ${number.format(firstOne.value!)}% đến ${number.format(lastOne.value!)}%)` : ''}, còn BAU ${firstBau && lastBau ? `${changeText(firstBau.value!, lastBau.value!)} (từ ${number.format(firstBau.value!)}% đến ${number.format(lastBau.value!)}%)` : ''}. ${gapText} Kết quả mô phỏng cho thấy 1Mha sử dụng vốn hiệu quả hơn trong giai đoạn này.`
        : `From ${startYear} to ${endYear}, ROI under ${t.oneMha} ${higherAllYears ? 'remained higher' : higherCount > paired.length / 2 ? 'was higher in most years' : 'was comparable'} than ${t[bau.family]}, ranging from ${bounds(oneMhaValues)}; BAU ranged from ${bounds(bauValues)}. ROI under 1Mha ${firstOne && lastOne ? `${changeText(firstOne.value!, lastOne.value!)} (from ${number.format(firstOne.value!)}% to ${number.format(lastOne.value!)}%)` : ''}, while BAU ${firstBau && lastBau ? `${changeText(firstBau.value!, lastBau.value!)} (from ${number.format(firstBau.value!)}% to ${number.format(lastBau.value!)}%)` : ''}. ${gapText} The simulation indicates more efficient capital use under 1Mha during this period.`
      return <p><EmphasizedNumbers text={text} /></p>
    }
  }

  if (models.length === 2 && models.some((model) => model.family === 'oneMha')) {
    const oneMha = models.find((model) => model.family === 'oneMha')!
    const bau = models.find((model) => model.family !== 'oneMha')!
    const values = (model: typeof oneMha) => model.values.filter((point) => point.year >= startYear && point.year <= endYear && point.value !== null).sort((a, b) => a.year - b.year)
    const oneValues = values(oneMha), bauValues = values(bau)
    if (oneValues.length && bauValues.length) {
      const number = new Intl.NumberFormat(language, { maximumFractionDigits: 1 })
      const mean = (points: typeof oneValues) => points.reduce((sum, point) => sum + point.value!, 0) / points.length
      const oneMean = mean(oneValues), bauMean = mean(bauValues), difference = oneMean - bauMean
      const amount = metric === 'margin' ? `${number.format(Math.abs(difference))} ${language === 'vi' ? 'điểm %' : 'pp'}` : `${number.format(Math.abs(bauMean === 0 ? difference : difference / Math.abs(bauMean) * 100))} %`
      const relation = Math.abs(difference) < 0.000001 ? (language === 'vi' ? 'tương đương' : 'similar') : difference > 0 ? (language === 'vi' ? 'cao hơn' : 'higher') : (language === 'vi' ? 'thấp hơn' : 'lower')
      const range = (points: typeof oneValues) => `${number.format(Math.min(...points.map((point) => point.value!)))}–${number.format(Math.max(...points.map((point) => point.value!)))} ${seasonalUnit(metric, language)}`
      const change = (points: typeof oneValues) => seasonalChange(points[0]!.value!, points.at(-1)!.value!, metric, language).text
      const text = language === 'vi'
        ? `Trong giai đoạn ${startYear}–${endYear}, ${t.oneMha} đạt bình quân ${number.format(oneMean)} ${seasonalUnit(metric, language)}, ${relation} ${amount} so với ${t[bau.family]} (${number.format(bauMean)} ${seasonalUnit(metric, language)}). Giá trị của 1Mha dao động ${range(oneValues)} và ${change(oneValues)}; ${t[bau.family]} dao động ${range(bauValues)} và ${change(bauValues)}.`
        : `From ${startYear} to ${endYear}, ${t.oneMha} averaged ${number.format(oneMean)} ${seasonalUnit(metric, language)}, ${relation} by ${amount} compared with ${t[bau.family]} (${number.format(bauMean)} ${seasonalUnit(metric, language)}). Values under 1Mha ranged from ${range(oneValues)} and ${change(oneValues)}; ${t[bau.family]} ranged from ${range(bauValues)} and ${change(bauValues)}.`
      return <p><EmphasizedNumbers text={text} /></p>
    }
  }

  const number = new Intl.NumberFormat(language, { maximumFractionDigits: 1 })
  const summaries = models.map((model) => {
      const values = model.values.filter((point) => point.year >= startYear && point.year <= endYear && point.value !== null).sort((a, b) => a.year - b.year)
      const change = values.length > 1
        ? seasonalChange(values[0]!.value!, values[values.length - 1]!.value!, metric, language)
        : null
      if (!values.length) return null
      const start = values[0]!, end = values.at(-1)!
      const range = `${number.format(Math.min(...values.map((point) => point.value!)))}–${number.format(Math.max(...values.map((point) => point.value!)))} ${seasonalUnit(metric, language)}`
      return { label: t[model.family], change: change?.text, range, start: start.value!, end: end.value! }
    }).filter((summary): summary is NonNullable<typeof summary> => summary !== null)

  const text = summaries.length ? language === 'vi'
    ? `Trong giai đoạn ${startYear}–${endYear}, ${summaries.map((item) => `${item.label} dao động ${item.range} và ${item.change ?? 'không đủ dữ liệu để xác định xu hướng'} (từ ${number.format(item.start)} đến ${number.format(item.end)})`).join('; ')}.`
    : `From ${startYear} to ${endYear}, ${summaries.map((item) => `${item.label} ranged from ${item.range} and ${item.change ?? 'had insufficient data to determine a trend'} (from ${number.format(item.start)} to ${number.format(item.end)})`).join('; ')}.` : t.noTrendData
  return <p><EmphasizedNumbers text={text} /></p>
}
