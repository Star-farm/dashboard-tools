import { useId, useLayoutEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import type { RefObject } from 'react'
import type { Language } from '../../i18n'
import { mapText } from './mapText'
import { soilText } from './soilText'
import type { MapMetric, PlotShape } from './mapTypes'

export default function PlotMapPopup({ plot, wardName, thematic = false, placement = 'top-right', language, metric, anchor, yieldValue, incomeValue, closeRef, onClose }: {
  plot: PlotShape
  wardName?: string
  thematic?: boolean
  placement?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
  language: Language
  metric: MapMetric
  anchor?: { x: number; y: number; bounds?: { left: number; top: number; right: number; bottom: number } }
  yieldValue: number | null | undefined
  incomeValue: number | null | undefined
  closeRef: RefObject<HTMLButtonElement | null>
  onClose: () => void
}) {
  const titleId = useId()
  const popupRef = useRef<HTMLElement>(null)
  const [position, setPosition] = useState<{ left: number; top: number }>()
  const t = mapText[language]
  const number = new Intl.NumberFormat(language, { maximumFractionDigits: 2 })
  const money = new Intl.NumberFormat(language, { maximumFractionDigits: language === 'vi' ? 0 : 2 })
  const format = (value: number | null | undefined) => value == null ? '—' : number.format(value)

  useLayoutEffect(() => {
    const popup = popupRef.current
    const frame = popup?.parentElement
    if (!anchor || !popup || !frame) {
      setPosition(undefined)
      return
    }
    const updatePosition = () => {
      const inset = 12
      const gap = 14
      const popupWidth = popup.offsetWidth
      const popupHeight = popup.offsetHeight
      const bounds = anchor.bounds ?? { left: anchor.x, right: anchor.x, top: anchor.y, bottom: anchor.y }
      const maxLeft = Math.max(inset, frame.clientWidth - popupWidth - inset)
      const maxTop = Math.max(inset, frame.clientHeight - popupHeight - inset)
      const clamp = (value: number, maximum: number) => Math.min(Math.max(inset, value), maximum)
      const candidates = [
        { left: Math.max(anchor.x, bounds.right) + gap, top: anchor.y - popupHeight / 2 },
        { left: Math.min(anchor.x, bounds.left) - popupWidth - gap, top: anchor.y - popupHeight / 2 },
        { left: anchor.x - popupWidth / 2, top: Math.min(anchor.y, bounds.top) - popupHeight - gap },
        { left: anchor.x - popupWidth / 2, top: Math.max(anchor.y, bounds.bottom) + gap },
      ].map((candidate) => {
        const left = clamp(candidate.left, maxLeft), top = clamp(candidate.top, maxTop)
        const overlapWidth = Math.max(0, Math.min(left + popupWidth, bounds.right) - Math.max(left, bounds.left))
        const overlapHeight = Math.max(0, Math.min(top + popupHeight, bounds.bottom) - Math.max(top, bounds.top))
        const dx = anchor.x < left ? left - anchor.x : anchor.x > left + popupWidth ? anchor.x - left - popupWidth : 0
        const dy = anchor.y < top ? top - anchor.y : anchor.y > top + popupHeight ? anchor.y - top - popupHeight : 0
        return { left, top, score: overlapWidth * overlapHeight * 1000 + Math.hypot(dx, dy) }
      })
      const best = candidates.reduce((current, candidate) => candidate.score < current.score ? candidate : current)
      setPosition((current) => current?.left === best.left && current.top === best.top ? current : { left: best.left, top: best.top })
    }
    updatePosition()
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(updatePosition)
    observer.observe(popup)
    observer.observe(frame)
    return () => observer.disconnect()
  }, [anchor, language, metric, plot.id, plot.areaHa, wardName, yieldValue, incomeValue, thematic])

  const style = position ? {
    '--plot-popup-left': `${position.left}px`,
    '--plot-popup-top': `${position.top}px`,
  } as CSSProperties : undefined

  return <section ref={popupRef} className={`plot-map-popup${position ? ' plot-map-popup--anchored' : ''}`} data-placement={placement} style={style} role="dialog" aria-modal="false" aria-labelledby={titleId}>
    <header>
      <div><p>{t.plotInfo}</p><h3 id={titleId}>{thematic ? soilText[language].plot : t.plot} {plot.id}</h3></div>
      <button type="button" ref={closeRef} aria-label={t.closePopup} onClick={onClose}>
        <svg aria-hidden="true" width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="m4 4 10 10M14 4 4 14" /></svg>
      </button>
    </header>
    <dl>
      {wardName && <div className="plot-map-popup-ward"><dt>{language === 'vi' ? 'Xã/phường' : 'Commune/ward'}</dt><dd className="plot-map-popup-ward-name">{wardName}</dd></div>}
      <div><dt>{t.area}</dt><dd>{format(plot.areaHa)} <small>ha</small></dd></div>
      {!thematic && (metric === 'yield'
        ? <div><dt>{t.yield}</dt><dd>{format(yieldValue)} <small>{t.yieldUnit}</small></dd></div>
        : <div><dt>{t.income}</dt><dd>{incomeValue == null ? '—' : money.format(incomeValue)} <small>{t.incomeUnit}</small></dd></div>)}
    </dl>
  </section>
}
