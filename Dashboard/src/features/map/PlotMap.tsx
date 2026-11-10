
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import type { Language } from '../../i18n'
import { colorFor } from './mapData'
import { mapText } from './mapText'
import type { MapGeometry, MapMetric } from './mapTypes'
import { zoomViewport } from './mapViewport'
import { soilText } from './soilText'
import { soilUnknownColor } from './soilTypes'
import type { SoilLayer } from './soilTypes'

export default function PlotMap({
  geometry,
  values,
  metric,
  breaks,
  language,
  yieldValues,
  incomeValues,
  periodLabel,
  scenarioLabel,
  thematic,
}: {
  geometry: MapGeometry
  values: (number | null)[]
  metric: MapMetric
  breaks: number[]
  language: Language
  yieldValues: (number | null)[]
  incomeValues: (number | null)[]
  periodLabel: string
  scenarioLabel: string
  thematic?: SoilLayer
}) {
  const t = mapText[language]
  const st = soilText[language]
  const plotLabel = thematic ? st.plot : t.plot
  const mapLabel = thematic ? st.map : t.mapLabel
  const helpId = thematic ? 'soil-map-interaction-help' : 'map-interaction-help'

  const svgRef = useRef<SVGSVGElement>(null)
  const frameRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)

  const popupTitleId = useId()

  const drag = useRef<{
    x: number
    y: number
    lastX: number
    lastY: number
    moved: boolean
    plot: number | null
  } | null>(null)

  const suppressClick = useRef(false)

  const [view, setView] = useState({
    zoom: 1,
    x: geometry.width / 2,
    y: geometry.height / 2,
  })

  const [hover, setHover] = useState<number | null>(null)
  const [selected, setSelected] = useState<number | null>(null)

  // Track SVG size for an accurate, responsive scale bar
  const [svgSize, setSvgSize] = useState({
    width: 0,
    height: 0,
  })

  const width = (geometry.width + 70) / view.zoom
  const height = (geometry.height + 120) / view.zoom

  const number = useMemo(
    () =>
      new Intl.NumberFormat(language, {
        maximumFractionDigits: 2,
      }),
    [language]
  )

  const money = useMemo(
    () =>
      new Intl.NumberFormat(language, {
        maximumFractionDigits: language === 'vi' ? 0 : 2,
      }),
    [language]
  )

  const metricNumber = metric === 'income' ? money : number

  const unit = metric === 'income'
    ? t.incomeUnit
    : t.yieldUnit

  function zoom(factor: number) {
    setView((current) => zoomViewport(current, factor))
  }

  function reset() {
    setView({
      zoom: 1,
      x: geometry.width / 2,
      y: geometry.height / 2,
    })
  }

  function pointToMap(event: {
    clientX: number
    clientY: number
  }) {
    const inverse = svgRef.current
      ?.getScreenCTM?.()
      ?.inverse()

    if (!inverse) return null

    return new DOMPoint(
      event.clientX,
      event.clientY
    ).matrixTransform(inverse)
  }

  function closePopup() {
    setSelected(null)
    svgRef.current?.focus({ preventScroll: true })
  }

  // ---------------------------------------
  // Mouse wheel zoom
  // ---------------------------------------
  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return

    const wheel = (event: WheelEvent) => {
      if (!event.deltaY) return

      event.preventDefault()

      const pixels =
        event.deltaY *
        (
          event.deltaMode === 1
            ? 16
            : event.deltaMode === 2
              ? svg.clientHeight || 500
              : 1
        )

      const factor = Math.exp(
        -Math.max(
          -0.6,
          Math.min(0.6, pixels * 0.0015)
        )
      )

      const inverse = svg
        .getScreenCTM?.()
        ?.inverse()

      const anchor = inverse
        ? new DOMPoint(
            event.clientX,
            event.clientY
          ).matrixTransform(inverse)
        : undefined

      setView((current) =>
        zoomViewport(current, factor, anchor)
      )
    }

    svg.addEventListener('wheel', wheel, {
      passive: false,
    })

    return () => {
      svg.removeEventListener('wheel', wheel)
    }
  }, [])

  // ---------------------------------------
  // Observe map size for responsive scale
  // ---------------------------------------
  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return

    const updateSize = () => {
      const rect = svg.getBoundingClientRect()

      setSvgSize({
        width: rect.width,
        height: rect.height,
      })
    }

    updateSize()

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', updateSize)
      return () => window.removeEventListener('resize', updateSize)
    }

    const observer = new ResizeObserver(updateSize)
    observer.observe(svg)

    return () => observer.disconnect()
  }, [])

  // ---------------------------------------
  // Popup focus and outside click
  // ---------------------------------------
  useEffect(() => {
    if (selected === null) return

    closeRef.current?.focus({
      preventScroll: true,
    })

    const outside = (
      event: globalThis.PointerEvent
    ) => {
      if (
        event.target instanceof Node &&
        !frameRef.current?.contains(event.target)
      ) {
        setSelected(null)
      }
    }

    document.addEventListener(
      'pointerdown',
      outside
    )

    return () => {
      document.removeEventListener(
        'pointerdown',
        outside
      )
    }
  }, [selected])

  // ---------------------------------------
  // Plot paths
  // ---------------------------------------
  const paths = useMemo(
    () =>
      geometry.plots.map((plot) => (
        <path
          key={plot.id}
          data-plot={plot.id}
          d={plot.path}
          onClick={(event) => {
            if (
              !suppressClick.current ||
              event.detail === 0
            ) {
              setSelected(plot.id)
            }
          }}
          tabIndex={plot.id === 0 ? 0 : -1}
          role="button"
          aria-label={`${plotLabel} ${plot.id}`}
          onKeyDown={(event) => {
            if (
              event.key === 'Enter' ||
              event.key === ' '
            ) {
              event.preventDefault()
              event.stopPropagation()
              setSelected(plot.id)
            }
          }}
          fill={thematic ? soilUnknownColor : colorFor(
            values[plot.id] ?? null,
            breaks
          )}
          fillRule="evenodd"
          stroke="#254f3d"
          strokeOpacity={0.6}
          strokeWidth={0.5}
          vectorEffect="non-scaling-stroke"
        >
          <title>
            {thematic ? `${plotLabel} ${plot.id} | ${thematic.title[language]}` : `${t.plot} ${plot.id} | ${number.format(
              plot.areaHa
            )} ha | ${
              values[plot.id] == null
                ? t.noData
                : `${metricNumber.format(
                    values[plot.id]!
                  )} ${unit}`
            }`}
          </title>
        </path>
      )),
    [
      geometry,
      values,
      breaks,
      t,
      number,
      metricNumber,
      unit,
      thematic,
      plotLabel,
      language,
    ]
  )

  // ---------------------------------------
  // Geographic scale bar
  // ---------------------------------------

  // Keep the previous distance behavior
  const scaleKm = 20 / view.zoom

  // Convert distance to SVG map units
  const scaleWidth =
    20000 /
    geometry.metersPerUnit /
    view.zoom

  // Default SVG preserveAspectRatio is xMidYMid meet.
  // Use the same uniform scaling to convert
  // geographic map units into displayed pixels.
  const pixelsPerUnit =
    svgSize.width > 0 &&
    svgSize.height > 0 &&
    width > 0 &&
    height > 0
      ? Math.min(
          svgSize.width / width,
          svgSize.height / height
        )
      : 0

  const scalePixelWidth =
    scaleWidth * pixelsPerUnit

  const showScale =
    Number.isFinite(scalePixelWidth) &&
    scalePixelWidth > 0

  // ---------------------------------------
  // Selected plot
  // ---------------------------------------
  const plot =
    selected === null
      ? undefined
      : geometry.plots.find(
          (shape) => shape.id === selected
        )

  const format = (
    value: number | null | undefined
  ) =>
    value == null
      ? '—'
      : number.format(value)

  const soilPlot = thematic?.plots.find((item) => item.id === selected)
  const thematicOutlines = useMemo(() => geometry.plots.map((shape) => <path key={shape.id} d={shape.path} fill="none" stroke="#254f3d" strokeOpacity={0.6} strokeWidth={0.5} vectorEffect="non-scaling-stroke" />), [geometry])
  const thematicPaths = useMemo(() => {
    if (!thematic) return null
    const colors = new Map(thematic.categories.map((category) => [category.id, category.color]))
    return thematic.features.map((feature, index) => <path
      key={`${feature.plotId}-${index}`}
      d={feature.path}
      fill={colors.get(feature.categoryId) ?? soilUnknownColor}
      fillRule="evenodd"
    />)
  }, [thematic])
  const soilArea = soilPlot?.areaHa ?? 0
  const percent = (area: number) => `${number.format(soilArea > 0 ? area / soilArea * 100 : 0)}%`

  return (
    <div
      className="plot-map-frame"
      ref={frameRef}
      onKeyDown={(event) => {
        if (
          event.key === 'Escape' &&
          selected !== null
        ) {
          event.preventDefault()
          event.stopPropagation()
          closePopup()
        }
      }}
    >
      {/* Map controls */}
      <div
        className="plot-map-controls"
        role="group"
        aria-label={mapLabel}
      >
        <button
          type="button"
          onClick={() => zoom(1.6)}
          disabled={view.zoom >= 12}
          aria-label={t.zoomIn}
          title={t.zoomIn}
        >
          +
        </button>

        <button
          type="button"
          onClick={() => zoom(1 / 1.6)}
          disabled={view.zoom <= 1}
          aria-label={t.zoomOut}
          title={t.zoomOut}
        >
          −
        </button>

        <button
          type="button"
          className="map-fit"
          onClick={reset}
        >
          {t.resetView}
        </button>
      </div>

      {/* North indicator */}
      <div
        className="plot-map-north"
        aria-label={t.north}
      >
        <span aria-hidden="true">↑</span>
        <span>{language === 'vi' ? 'B' : 'N'}</span>
      </div>

      {/* Main map SVG */}
      <svg
        ref={svgRef}
        className="plot-map-svg"
        viewBox={`${
          view.x - width / 2
        } ${
          view.y - height / 2
        } ${width} ${height}`}
        role="group"
        aria-label={mapLabel}
        aria-describedby={helpId}
        tabIndex={0}

        onKeyDown={(event) => {
          if (
            event.key === '+' ||
            event.key === '='
          ) {
            event.preventDefault()
            zoom(1.6)
          }

          if (event.key === '-') {
            event.preventDefault()
            zoom(1 / 1.6)
          }

          if (event.key === 'Home') {
            event.preventDefault()
            reset()
          }

          const direction = {
            ArrowLeft: [-1, 0],
            ArrowRight: [1, 0],
            ArrowUp: [0, -1],
            ArrowDown: [0, 1],
          }[event.key]

          if (direction) {
            event.preventDefault()

            setView((v) => ({
              ...v,
              x: v.x + direction[0] * width / 8,
              y: v.y + direction[1] * height / 8,
            }))
          }
        }}

        onPointerDown={(event) => {
          if (event.button !== 0) return

          const plot = (
            event.target as Element
          )
            .closest('[data-plot]')
            ?.getAttribute('data-plot')

          suppressClick.current = false

          drag.current = {
            x: event.clientX,
            y: event.clientY,
            lastX: event.clientX,
            lastY: event.clientY,
            moved: false,
            plot:
              plot == null
                ? null
                : Number(plot),
          }

          event.currentTarget.setPointerCapture(
            event.pointerId
          )
        }}

        onPointerMove={(event) => {
          const active = drag.current

          if (!active) {
            const plot = (
              event.target as Element
            )
              .closest('[data-plot]')
              ?.getAttribute('data-plot')

            setHover(
              plot == null
                ? null
                : Number(plot)
            )

            return
          }

          if (
            Math.hypot(
              event.clientX - active.x,
              event.clientY - active.y
            ) > 5
          ) {
            active.moved = true
            suppressClick.current = true
          }

          if (active.moved) {
            const point = pointToMap(event)

            const inverse = svgRef.current
              ?.getScreenCTM?.()
              ?.inverse()

            if (point && inverse) {
              const previous = new DOMPoint(
                active.lastX,
                active.lastY
              ).matrixTransform(inverse)

              setView((v) => ({
                ...v,
                x:
                  v.x -
                  (point.x - previous.x),
                y:
                  v.y -
                  (point.y - previous.y),
              }))
            }
          }

          active.lastX = event.clientX
          active.lastY = event.clientY
        }}

        onPointerUp={(event) => {
          if (
            drag.current &&
            !drag.current.moved
          ) {
            setSelected(drag.current.plot)
          }

          drag.current = null

          if (
            event.currentTarget.hasPointerCapture(
              event.pointerId
            )
          ) {
            event.currentTarget.releasePointerCapture(
              event.pointerId
            )
          }
        }}

        onPointerCancel={() => {
          drag.current = null
        }}

        onPointerLeave={() => {
          setHover(null)
        }}
      >
        <g>{paths}</g>
        {thematic && <g pointerEvents="none" aria-hidden="true">
          {thematicPaths}
          {thematicOutlines}
        </g>}

        {/* Highlight selected plot */}
        {plot && (
          <path
            d={plot.path}
            fill="none"
            stroke="#9a491e"
            strokeWidth={2.5}
            vectorEffect="non-scaling-stroke"
            pointerEvents="none"
          />
        )}
      </svg>

      {/* Fixed geographic scale overlay */}
      {showScale && (
        <div
          className="map-scale-overlay"
          role="img"
          aria-label={`${number.format(
            scaleKm
          )} km`}
        >
          <span className="map-scale-label">
            {number.format(scaleKm)} km
          </span>

          <svg
            width={scalePixelWidth}
            height="8"
            viewBox={`0 0 ${scalePixelWidth} 8`}
            aria-hidden="true"
          >
            <path
              d={`M0 0 V6 H${scalePixelWidth} V0`}
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            />
          </svg>
        </div>
      )}

      {/* Plot information popup */}
      {plot && (
        <section
          className="plot-map-popup"
          role="dialog"
          aria-modal="false"
          aria-labelledby={popupTitleId}
        >
          <header>
            <div>
              <p>{thematic ? thematic.title[language] : t.plotInfo}</p>
              <h3 id={popupTitleId}>
                {plotLabel} {plot.id}
              </h3>
            </div>

            <button
              type="button"
              ref={closeRef}
              aria-label={t.closePopup}
              onClick={closePopup}
            >
              <svg
                aria-hidden="true"
                width="18"
                height="18"
                viewBox="0 0 18 18"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path d="m4 4 10 10M14 4 4 14" />
              </svg>
            </button>
          </header>

          {thematic ? <>
            <p className="plot-popup-period">{st.shares}</p>
            <dl>
              <div><dt>{st.displayArea}</dt><dd>{format(soilArea)} <small>ha</small></dd></div>
              <div><dt>{st.coverage}</dt><dd>{percent(soilPlot?.knownAreaHa ?? 0)}</dd></div>
              {soilPlot?.shares.map((share) => <div key={share.categoryId}>
                <dt>{thematic.categories.find((category) => category.id === share.categoryId)?.label[language] ?? st.unknown}</dt>
                <dd>{percent(share.areaHa)} <small>({format(share.areaHa)} ha)</small></dd>
              </div>)}
              <div><dt>{st.unknown}</dt><dd>{percent(soilPlot?.unknownAreaHa ?? soilArea)} <small>({format(soilPlot?.unknownAreaHa ?? soilArea)} ha)</small></dd></div>
            </dl>
          </> : <><p className="plot-popup-period">
            {periodLabel}
          </p>

          <p className="plot-popup-scenario">
            {scenarioLabel}
          </p>

          <dl>
            <div>
              <dt>{t.area}</dt>
              <dd>
                {format(plot.areaHa)} <small>ha</small>
              </dd>
            </div>

            <div>
              <dt>{t.yield}</dt>
              <dd>
                {format(yieldValues[plot.id])}{' '}
                <small>{t.yieldUnit}</small>
              </dd>
            </div>

            <div>
              <dt>{t.income}</dt>
              <dd>
                {incomeValues[plot.id] == null
                  ? '—'
                  : money.format(incomeValues[plot.id]!)}{' '}
                <small>{t.incomeUnit}</small>
              </dd>
            </div>
          </dl>
          </>}
        </section>
      )}

      {/* Map caption */}
      <div className="plot-map-caption">
        {hover !== null
          ? `${plotLabel} ${hover}${
              !thematic && values[hover] != null
                ? ` · ${metricNumber.format(
                    values[hover]!
                  )} ${unit}`
                : ''
            }`
          : 'WGS 84 / UTM 48N'}
      </div>
    </div>
  )
}
