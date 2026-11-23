import type { Language } from '../i18n'


export function distinctAxisFormatter(ticks: number[], language: Language, compact = false) {
  const uniqueTicks = [...new Set(ticks.filter(Number.isFinite))]
  for (let precision = compact ? 2 : 0; precision <= (compact ? 21 : 12); precision += 1) {
    const formatter = new Intl.NumberFormat(language, compact
      ? { notation: 'compact', maximumSignificantDigits: precision }
      : { maximumFractionDigits: precision })
    const labels = uniqueTicks.map((tick) => formatter.format(tick))
    if (new Set(labels).size === labels.length) return (value: number) => formatter.format(value)
  }
  const formatter = new Intl.NumberFormat(language, { maximumSignificantDigits: 21 })
  return (value: number) => formatter.format(value)
}
