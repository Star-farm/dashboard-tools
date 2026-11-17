import { useId } from 'react'
import type { RefObject } from 'react'
import type { Language } from '../../i18n'
import { mapText } from './mapText'
import { soilText } from './soilText'
import type { PlotShape } from './mapTypes'

export default function PlotMapPopup({ plot, wardName, thematic = false, placement = 'top-right', language, yieldValue, incomeValue, closeRef, onClose }: {
  plot: PlotShape
  wardName?: string
  thematic?: boolean
  placement?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
  language: Language
  yieldValue: number | null | undefined
  incomeValue: number | null | undefined
  closeRef: RefObject<HTMLButtonElement | null>
  onClose: () => void
}) {
  const titleId = useId()
  const t = mapText[language]
  const number = new Intl.NumberFormat(language, { maximumFractionDigits: 2 })
  const money = new Intl.NumberFormat(language, { maximumFractionDigits: language === 'vi' ? 0 : 2 })
  const format = (value: number | null | undefined) => value == null ? '—' : number.format(value)

  return <section className="plot-map-popup" data-placement={placement} role="dialog" aria-modal="false" aria-labelledby={titleId}>
    <header>
      <div><p>{t.plotInfo}</p><h3 id={titleId}>{thematic ? soilText[language].plot : t.plot} {plot.id}</h3></div>
      <button type="button" ref={closeRef} aria-label={t.closePopup} onClick={onClose}>
        <svg aria-hidden="true" width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="m4 4 10 10M14 4 4 14" /></svg>
      </button>
    </header>
    <dl>
      {wardName && <div className="plot-map-popup-ward"><dt>{language === 'vi' ? 'Xã/phường' : 'Commune/ward'}</dt><dd className="plot-map-popup-ward-name">{wardName}</dd></div>}
      <div><dt>{t.area}</dt><dd>{format(plot.areaHa)} <small>ha</small></dd></div>
      {!thematic && <><div><dt>{t.yield}</dt><dd>{format(yieldValue)} <small>{t.yieldUnit}</small></dd></div>
      <div><dt>{t.income}</dt><dd>{incomeValue == null ? '—' : money.format(incomeValue)} <small>{t.incomeUnit}</small></dd></div></>}
    </dl>
  </section>
}
