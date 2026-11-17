import type { Language } from '../i18n'

export default function ChartUnitLabel({ unit, language }: { unit: string; language: Language }) {
  return <span className="chart-unit-label">{language === 'vi' ? 'Đơn vị' : 'Unit'}: {unit}</span>
}
