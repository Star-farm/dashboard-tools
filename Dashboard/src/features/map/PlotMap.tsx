
import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { Language } from '../../i18n'
import { colorFor, mapColors  } from './mapData'
import { mapText } from './mapText'
import type { AdminBoundaryData, MapGeometry, MapMetric } from './mapTypes'
import { DEFAULT_MAP_ZOOM, MAX_MAP_ZOOM, MIN_MAP_ZOOM, zoomViewport } from './mapViewport'
import { soilText } from './soilText'
import { soilUnknownColor } from './soilTypes'
import type { SoilLayer } from './soilTypes'
import PlotMapPopup from './PlotMapPopup'
import MapBasemap, { MapGeographicLabels } from './MapBasemap'

const ThematicOverlay = memo(function ThematicOverlay({ paths, outlines }: { paths: ReactNode; outlines: ReactNode }) {
  return <g pointerEvents="none" aria-hidden="true">{paths}{outlines}</g>
})



function incomePlotColor(
  value: number | null,
  breaks: number[],
  colors: readonly string[]
): string {

  if (value === null || !Number.isFinite(value)) {
    return colorFor(null, breaks)
  }

  if (breaks.length !== colors.length + 1) {
    return colorFor(value, breaks)
  }


  if (value < 0) {
    return colors[0]
  }


  for (let i = 1; i < colors.length - 1; i++) {
    if (value < breaks[i + 1]) {
      return colors[i]
    }
  }


  return colors[colors.length - 1]
}

function plotIdFromTarget(target: EventTarget): number | null {
  if (!(target instanceof Element)) return null
  const id = target.closest('[data-plot]')?.getAttribute('data-plot')
  return id === null || id === undefined ? null : Number(id)
}

type PlotPopupAnchor = { x: number; y: number; bounds: { left: number; top: number; right: number; bottom: number } }

export default function PlotMap({
  geometry,
  adminBoundaries,
  values,
  metric,
  breaks,
  colors = mapColors,
  language,
  yieldValues,
  incomeValues,
  thematic,
  onSelectionChange,
  rasterFile,
}: {
  geometry: MapGeometry
  adminBoundaries?: AdminBoundaryData
  values: (number | null)[]
  metric: MapMetric
  breaks: number[]
  language: Language
  yieldValues: (number | null)[]
  incomeValues: (number | null)[]
  thematic?: SoilLayer
  onSelectionChange?: (id: number | null) => void
  rasterFile?: string
  colors?: readonly string[]
}) {
  const t = mapText[language]
  const st = soilText[language]
  const plotLabel = thematic ? st.plot : t.plot
  const mapLabel = thematic ? st.map : t.mapLabel
  const helpId = thematic ? undefined : 'map-interaction-help'

  const svgRef = useRef<SVGSVGElement>(null)
  const frameRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)

  const drag = useRef<{
    x: number
    y: number
    lastX: number
    lastY: number
    moved: boolean
    plot: number | null
  } | null>(null)

  const suppressClick = useRef(false)
  const touches = useRef(new Map<number, { x: number; y: number }>())
  const pinchDistance = useRef<number | null>(null)
  const pinching = useRef(false)

  const [storedView, setView] = useState<{ zoom: number; x: number; y: number } | null>(null)
  const [popupAnchor, setPopupAnchor] = useState<PlotPopupAnchor>()
  const [popupMapAnchor, setPopupMapAnchor] = useState<{ plotId: number; x: number; y: number } | null>(null)

  const validAdminBoundaries = adminBoundaries
    && Array.isArray(adminBoundaries.bounds)
    && adminBoundaries.bounds.length === 4
    && adminBoundaries.bounds.every(Number.isFinite)
    && Array.isArray(adminBoundaries.features)
    ? adminBoundaries
    : undefined
  const adminRegion = useMemo(() => {
    if (!validAdminBoundaries) return null
    const [xmin, ymin, xmax, ymax] = validAdminBoundaries.bounds
    const [originX, , , originY] = geometry.bounds
    return {
      x: [(xmin - originX) / geometry.metersPerUnit, (xmax - originX) / geometry.metersPerUnit] as const,
      y: [(originY - ymax) / geometry.metersPerUnit, (originY - ymin) / geometry.metersPerUnit] as const,
    }
  }, [validAdminBoundaries, geometry])

  const mapCenter = useMemo(() => adminRegion
    ? { x: (adminRegion.x[0] + adminRegion.x[1]) / 2, y: (adminRegion.y[0] + adminRegion.y[1]) / 2 }
    : { x: geometry.width / 2, y: geometry.height / 2 }, [adminRegion, geometry])
  const mapWidth = adminRegion ? Math.max(geometry.width + 70, (adminRegion.x[1] - adminRegion.x[0]) * 2.1) : geometry.width + 70
  const mapHeight = adminRegion ? Math.max(geometry.height + 120, (adminRegion.y[1] - adminRegion.y[0]) * 2.1) : geometry.height + 120
  const plotCenter = useMemo(() => {
    if (!geometry.plots.length) return mapCenter
    const xs = geometry.plots.map(({ center }) => center[0]), ys = geometry.plots.map(({ center }) => center[1])
    return { x: (Math.min(...xs) + Math.max(...xs)) / 2, y: (Math.min(...ys) + Math.max(...ys)) / 2 }
  }, [geometry.plots, mapCenter])
  const initialCenter = plotCenter
  const initialView = useMemo(() => ({ zoom: DEFAULT_MAP_ZOOM, ...initialCenter }), [initialCenter])
  const view = storedView ?? initialView

  const [hover, setHover] = useState<number | null>(null)
  const [selected, setSelected] = useState<number | null>(null)
  const [failedRaster, setFailedRaster] = useState<string | null>(null)
  const rasterFailed = !!rasterFile && failedRaster === rasterFile
  useEffect(() => { onSelectionChange?.(selected) }, [selected, onSelectionChange])


  const [svgSize, setSvgSize] = useState({
    width: 0,
    height: 0,
  })

  const width = mapWidth / view.zoom
  const height = mapHeight / view.zoom
  const clampMapView = useCallback((candidate: { zoom: number; x: number; y: number }) => {
    if (!adminRegion) return candidate
    return {
      ...candidate,
      x: Math.max(adminRegion.x[0], Math.min(adminRegion.x[1], candidate.x)),
      y: Math.max(adminRegion.y[0], Math.min(adminRegion.y[1], candidate.y)),
    }
  }, [adminRegion])
  const updateView = useCallback((update: (current: { zoom: number; x: number; y: number }) => { zoom: number; x: number; y: number }) => {
    setView((current) => clampMapView(update(current ?? initialView)))
  }, [clampMapView, initialView])

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
    updateView((current) => zoomViewport(current, factor))
  }

  function reset() {
    setView(clampMapView({ zoom: DEFAULT_MAP_ZOOM, ...initialCenter }))
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

  function rememberPopupCursor(plotId: number, event: { clientX: number; clientY: number; pointerType?: string }) {
    if (event.pointerType === 'mouse' && window.matchMedia('(min-width: 768px)').matches) {
      const point = pointToMap(event)
      setPopupMapAnchor(point ? { plotId, x: point.x, y: point.y } : null)
    } else {
      setPopupMapAnchor(null)
    }
  }

  function closePopup() {
    setPopupMapAnchor(null)
    setSelected(null)
    svgRef.current?.focus({ preventScroll: true })
  }




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

      updateView((current) => zoomViewport(current, factor, anchor))
    }

    svg.addEventListener('wheel', wheel, {
      passive: false,
    })

    return () => {
      svg.removeEventListener('wheel', wheel)
    }
  }, [initialView, updateView])




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




  useEffect(() => {
    if (selected === null || thematic) return

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
  }, [selected, thematic])




  const paths = useMemo(
    () =>
      geometry.plots.map((plot) => (
        <path
          key={plot.id}
          data-plot={plot.id}
          d={plot.path}
          tabIndex={plot.id === 0 ? 0 : -1}
          role="button"
          aria-label={`${plotLabel} ${plot.id}`}

fill={
  thematic
    ? soilUnknownColor
    : metric === 'income'
      ? incomePlotColor(
          values[plot.id] ?? null,
          breaks,
          colors
        )
      : colorFor(
          values[plot.id] ?? null,
          breaks
        )
}

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
      breaks,metric,colors,
      t,
      number,
      metricNumber,
      unit,
      thematic,
      plotLabel,
      language,
    ]
  )





  const scaleMeters = 24000 / view.zoom


  const scaleWidth =
    scaleMeters /
    geometry.metersPerUnit




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




  const plot =
    selected === null
      ? undefined
      : geometry.plots.find(
          (shape) => shape.id === selected
        )
  useLayoutEffect(() => {
    const svg = svgRef.current
    const frame = frameRef.current
    const matrix = svg?.getScreenCTM?.()
    if (!plot || !frame || !svg || !matrix) {
      setPopupAnchor(undefined)
      return
    }
    const frameBounds = frame.getBoundingClientRect()
    const cursorPoint = popupMapAnchor?.plotId === plot.id
      ? popupMapAnchor
      : { x: plot.center[0], y: plot.center[1] }
    const anchorPoint = new DOMPoint(cursorPoint.x, cursorPoint.y).matrixTransform(matrix)
    const plotElement = svg.querySelector<SVGPathElement>(`[data-plot="${plot.id}"]`)
    const plotBounds = plotElement?.getBoundingClientRect()
    const bounds = plotBounds ? {
      left: plotBounds.left - frameBounds.left,
      top: plotBounds.top - frameBounds.top,
      right: plotBounds.right - frameBounds.left,
      bottom: plotBounds.bottom - frameBounds.top,
    } : { left: anchorPoint.x - frameBounds.left, right: anchorPoint.x - frameBounds.left, top: anchorPoint.y - frameBounds.top, bottom: anchorPoint.y - frameBounds.top }
    setPopupAnchor({ x: anchorPoint.x - frameBounds.left, y: anchorPoint.y - frameBounds.top, bounds })
  }, [plot, popupMapAnchor, view.x, view.y, view.zoom, svgSize.width, svgSize.height])
  const plotWardName = useMemo(() => {
    if (!plot || !validAdminBoundaries) return undefined
    const point = [
      geometry.bounds[0] + plot.center[0] * geometry.metersPerUnit,
      geometry.bounds[3] - plot.center[1] * geometry.metersPerUnit,
    ]
    const insideRing = (ring: number[][]) => {
      let inside = false
      for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        const [xi, yi] = ring[i], [xj, yj] = ring[j]
        if ((yi > point[1]) !== (yj > point[1]) && point[0] < ((xj - xi) * (point[1] - yi)) / (yj - yi) + xi) inside = !inside
      }
      return inside
    }
    return validAdminBoundaries.features.find((feature) => {
      if (feature.properties.kind !== 'ward') return false
      const polygons = feature.geometry.type === 'Polygon'
        ? [feature.geometry.coordinates as number[][][]]
        : feature.geometry.coordinates as number[][][][]
      return polygons.some((polygon) => insideRing(polygon[0]) && !polygon.slice(1).some(insideRing))
    })?.properties.fullName
  }, [plot, validAdminBoundaries, geometry])

  const thematicOutlines = useMemo(() => geometry.plots.map((shape) => <path key={shape.id} d={shape.path} fill="none" stroke="#254f3d" strokeOpacity={0.6} strokeWidth={0.5} vectorEffect="non-scaling-stroke" />), [geometry])
  const thematicPaths = useMemo(() => {
    if (!thematic || rasterFile) return null
    const colors = new Map(thematic.categories.map((category) => [category.id, category.color]))
    return thematic.features.map((feature, index) => <path
      key={`${feature.plotId}-${index}`}
      d={feature.path}
      fill={colors.get(feature.categoryId) ?? soilUnknownColor}
      fillRule="evenodd"
    />)
  }, [thematic, rasterFile])
  const adminPaths = useMemo(() => {
    if (!validAdminBoundaries) return null
    const toMap = ([x, y]: number[]) => [
      (x - geometry.bounds[0]) / geometry.metersPerUnit,
      (geometry.bounds[3] - y) / geometry.metersPerUnit,
    ]
    const crossSectionSpan = (point: number[], fixedAxis: 0 | 1, polygons: number[][][][]) => {
      const value = point[fixedAxis], otherAxis = fixedAxis === 0 ? 1 : 0
      const crossings: number[] = []
      for (const polygon of polygons) for (const ring of polygon) {
        const points = ring.map(toMap)
        for (let index = 0; index < points.length; index++) {
          const a = points[index], b = points[(index + 1) % points.length]
          if ((a[fixedAxis] <= value && b[fixedAxis] > value) || (b[fixedAxis] <= value && a[fixedAxis] > value)) {
            const ratio = (value - a[fixedAxis]) / (b[fixedAxis] - a[fixedAxis])
            crossings.push(a[otherAxis] + ratio * (b[otherAxis] - a[otherAxis]))
          }
        }
      }
      const before = crossings.filter((crossing) => crossing < point[otherAxis]).sort((a, b) => b - a)[0]
      const after = crossings.filter((crossing) => crossing > point[otherAxis]).sort((a, b) => a - b)[0]
      return before === undefined || after === undefined ? 0 : after - before
    }
    const labelPlacement = (feature: AdminBoundaryData['features'][number]) => {
      const point = toMap(feature.properties.center)
      const viewBounds = [view.x - width / 2, view.y - height / 2, view.x + width / 2, view.y + height / 2]
      if (point[0] <= viewBounds[0] || point[0] >= viewBounds[2] || point[1] <= viewBounds[1] || point[1] >= viewBounds[3]) return null
      const polygons = feature.geometry.type === 'Polygon'
        ? [feature.geometry.coordinates as number[][][]]
        : feature.geometry.coordinates as number[][][][]
      const horizontalSpan = Math.min(crossSectionSpan(point, 1, polygons), 2 * Math.min(point[0] - viewBounds[0], viewBounds[2] - point[0]))
      const verticalSpan = Math.min(crossSectionSpan(point, 0, polygons), 2 * Math.min(point[1] - viewBounds[1], viewBounds[3] - point[1]))
      return { point, horizontalSpan, verticalSpan }
    }
    const d = (feature: AdminBoundaryData['features'][number]) => {
      const polygons = feature.geometry.type === 'Polygon'
        ? [feature.geometry.coordinates as number[][][]]
        : feature.geometry.coordinates as number[][][][]
      return polygons.flatMap((polygon) => polygon.map((ring) => {
        const points = ring.map(toMap)
        return points.length ? `M${points.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join('L')}Z` : ''
      })).join('')
    }
    const provinces = validAdminBoundaries.features.filter((feature) => feature.properties.kind === 'province')
    const wards = validAdminBoundaries.features.filter((feature) => feature.properties.kind === 'ward')
    const fontSizeFor = (placement: NonNullable<ReturnType<typeof labelPlacement>>, line1: string, line2: string) => Math.min(
      Math.max(8, width * 0.018),
      placement.horizontalSpan / (Math.max(line1.length, line2.length) * 0.64),
      placement.verticalSpan / ((line2 ? 2 : 1) * 1.2),
    )
    const canThoFeature = provinces.find((feature) => feature.properties.provinceCode === '92')
    const canThoPlacement = canThoFeature ? labelPlacement(canThoFeature) : null
    const canThoLine1 = language === 'vi' ? canThoFeature?.properties.name ?? '' : canThoFeature?.properties.nameEn ?? ''
    const defaultProvinceFontSize = canThoPlacement
      ? fontSizeFor(canThoPlacement, canThoLine1, '')
      : Math.max(8, width * 0.018)
    return {
      boundaries: <g pointerEvents="none" aria-hidden="true" className="admin-boundary-layer">
        {provinces.map((feature) => <path key={`province-${feature.properties.provinceCode}`} d={d(feature)} fill="#f2f5ed" fillOpacity={0.16} fillRule="evenodd" stroke="#526b55" strokeWidth={1.6} vectorEffect="non-scaling-stroke"><title>{feature.properties.provinceName}</title></path>)}
        {wards.map((feature) => <path key={`ward-${feature.properties.code}`} d={d(feature)} fill={feature.properties.provinceCode === '82' ? '#e8efdf' : 'none'} fillOpacity={0.12} fillRule="evenodd" stroke="#899b84" strokeOpacity={0.85} strokeWidth={0.65} vectorEffect="non-scaling-stroke"><title>{feature.properties.fullName}</title></path>)}
      </g>,
      labels: <g pointerEvents="none" aria-hidden="true" className="admin-label-layer">
      {provinces.map((feature) => {
        const placement = labelPlacement(feature)
        if (!placement) return null
        const isHoChiMinh = feature.properties.provinceCode === '79'
        const line1 = isHoChiMinh ? (language === 'vi' ? 'Thành phố' : 'Ho Chi Minh') : (language === 'vi' ? feature.properties.name : feature.properties.nameEn)
        const line2 = isHoChiMinh ? (language === 'vi' ? 'Hồ Chí Minh' : 'City') : ''
        const [x, y] = placement.point
        const fitFontSize = fontSizeFor(placement, line1, line2)
        const fontSize = view.zoom === DEFAULT_MAP_ZOOM
          ? defaultProvinceFontSize
          : Math.max(defaultProvinceFontSize, Math.min(Math.max(8, width * 0.018), fitFontSize))
        if (fontSize < 4.5) return null
        return <text key={`province-label-${feature.properties.provinceCode}`} x={x} y={isHoChiMinh ? y - fontSize * 0.55 : y} textAnchor="middle" fontSize={fontSize} fontWeight="700" fill="#344b37" stroke="#fffefa" strokeWidth={2} paintOrder="stroke">
          {isHoChiMinh
            ? <><tspan x={x}>{language === 'vi' ? 'Thành phố' : 'Ho Chi Minh'}</tspan><tspan x={x} dy={fontSize * 1.1}>{language === 'vi' ? 'Hồ Chí Minh' : 'City'}</tspan></>
            : (language === 'vi' ? feature.properties.name : feature.properties.nameEn)}
        </text>
      })}
      {view.zoom >= DEFAULT_MAP_ZOOM * 3 && wards.map((feature) => {
        const [labelX, labelY] = toMap(feature.properties.center)
        return <text key={`ward-label-${feature.properties.code}`} x={labelX} y={labelY} textAnchor="middle" fontSize={Math.max(2.4, width * 0.011)} fill="#354d38" stroke="#fffefa" strokeWidth={0.9} paintOrder="stroke">{language === 'vi' ? feature.properties.name : feature.properties.nameEn}</text>
      })}
      </g>,
    }
  }, [validAdminBoundaries, geometry, view.x, view.y, view.zoom, width, height, language])
  const showPopup = true

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

      <div
        className="plot-map-controls"
        role="group"
        aria-label={mapLabel}
      >
        <button
          type="button"
          onClick={() => zoom(1.6)}
          disabled={view.zoom >= MAX_MAP_ZOOM}
          aria-label={t.zoomIn}
          title={t.zoomIn}
        >
          +
        </button>

        <button
          type="button"
          onClick={() => zoom(1 / 1.6)}
          disabled={view.zoom <= MIN_MAP_ZOOM}
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
        {thematic && selected !== null && <button type="button" className="map-fit" onClick={() => setSelected(null)}>{language === 'vi' ? 'Bỏ chọn vùng' : 'Clear selection'}</button>}
      </div>


      <div
        className="plot-map-north"
        aria-label={t.north}
      >
        <span aria-hidden="true">↑</span>
        <span>{language === 'vi' ? 'B' : 'N'}</span>
      </div>


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

        onClick={(event) => {
          const plotId = plotIdFromTarget(event.target)
          if (plotId !== null && (!suppressClick.current || event.detail === 0)) {
            rememberPopupCursor(plotId, { clientX: event.clientX, clientY: event.clientY, pointerType: event.detail === 0 ? 'keyboard' : 'mouse' })
            setSelected(plotId)
          }
        }}
        onKeyDown={(event) => {
          const plotId = plotIdFromTarget(event.target)
          if (plotId !== null && (event.key === 'Enter' || event.key === ' ')) {
            event.preventDefault()
            event.stopPropagation()
            setPopupMapAnchor(null)
            setSelected(plotId)
            return
          }

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

            updateView((currentView) => {
              return {
                ...currentView,
                x: currentView.x + direction[0] * width / 8,
                y: currentView.y + direction[1] * height / 8,
              }
            })
          }
        }}

        onPointerDown={(event) => {
          if (event.button !== 0) return

          if (event.pointerType === 'touch') {
            touches.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
            event.currentTarget.setPointerCapture(event.pointerId)
            if (touches.current.size >= 2) {
              const [a, b] = [...touches.current.values()]
              pinchDistance.current = Math.hypot(a.x - b.x, a.y - b.y)
              pinching.current = true
              suppressClick.current = true
              drag.current = null
              return
            }
          }

          const plot = plotIdFromTarget(event.target)

          suppressClick.current = false

          drag.current = {
            x: event.clientX,
            y: event.clientY,
            lastX: event.clientX,
            lastY: event.clientY,
            moved: false,
            plot,
          }

          event.currentTarget.setPointerCapture(
            event.pointerId
          )
        }}

        onPointerMove={(event) => {
          if (event.pointerType === 'touch' && touches.current.has(event.pointerId)) {
            touches.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
            if (pinching.current) {
              if (touches.current.size >= 2) {
                const [a, b] = [...touches.current.values()]
                const distance = Math.hypot(a.x - b.x, a.y - b.y)
                const anchor = pointToMap({ clientX: (a.x + b.x) / 2, clientY: (a.y + b.y) / 2 })
                if (anchor && pinchDistance.current && distance > 0) {
                  const factor = distance / pinchDistance.current
                  updateView((current) => zoomViewport(current, factor, anchor))
                }
                pinchDistance.current = distance
              }
              return
            }
          }
          const active = drag.current

          if (!active) {
            setHover(plotIdFromTarget(event.target))

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

              updateView((currentView) => {
                return {
                  ...currentView,
                  x: currentView.x - (point.x - previous.x),
                  y: currentView.y - (point.y - previous.y),
                }
              })
            }
          }

          active.lastX = event.clientX
          active.lastY = event.clientY
        }}

        onPointerUp={(event) => {
          if (event.pointerType === 'touch') {
            touches.current.delete(event.pointerId)
            if (pinching.current) {
              if (!touches.current.size) { pinching.current = false; pinchDistance.current = null }
              if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
              return
            }
          }
          if (
            drag.current &&
            !drag.current.moved
          ) {
            if (drag.current.plot !== null) rememberPopupCursor(drag.current.plot, event)
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

        onPointerCancel={(event) => {
          drag.current = null
          touches.current.delete(event.pointerId)
          if (!touches.current.size) { pinching.current = false; pinchDistance.current = null }
        }}

        onPointerLeave={() => {
          setHover(null)
        }}
      >
        <MapBasemap bounds={geometry.bounds} metersPerUnit={geometry.metersPerUnit} />
        {adminPaths?.boundaries}
        <g>{paths}</g>
        {thematic && <ThematicOverlay paths={rasterFile ? !rasterFailed && <image href={`${import.meta.env.BASE_URL}map-data/${rasterFile}`} x={0} y={0} width={geometry.width} height={geometry.height} preserveAspectRatio="none" onError={() => setFailedRaster(rasterFile)} /> : thematicPaths} outlines={thematicOutlines} />}
        <MapGeographicLabels bounds={geometry.bounds} metersPerUnit={geometry.metersPerUnit} language={language} labelSize={Math.max(2.4, width * 0.012)} />
        {adminPaths?.labels}


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

      {rasterFailed && <div className="map-loading-overlay"><div className="map-error" role="alert"><p>{st.error}</p><button type="button" className="primary-button" onClick={() => setFailedRaster(null)}>{st.retry}</button></div></div>}

      <div className="map-basemap-credit" aria-label="Map attribution">
        <a href="https://www.naturalearthdata.com/downloads/10m-physical-vectors/" target="_blank" rel="noreferrer">{t.basemapCredit}</a>
      </div>


      {showScale && (
        <div
          className="map-scale-overlay"
          role="img"
          aria-label={scaleMeters >= 1000 ? `${number.format(scaleMeters / 1000)} km` : `${number.format(scaleMeters)} m`}
        >
          <span className="map-scale-label">
            {scaleMeters >= 1000 ? `${number.format(scaleMeters / 1000)} km` : `${number.format(scaleMeters)} m`}
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

      {plot && showPopup && <PlotMapPopup
        plot={plot}
        wardName={plotWardName}
        thematic={!!thematic}
        placement={`${plot.center[1] <= view.y ? 'bottom' : 'top'}-${plot.center[0] <= view.x ? 'right' : 'left'}`}
        language={language}
        metric={metric}
        anchor={popupAnchor}
        yieldValue={yieldValues[plot.id]}
        incomeValue={incomeValues[plot.id]}
        closeRef={closeRef}
        onClose={closePopup}
      />}


      <div className="plot-map-caption">
        {hover !== null
          ? `${plotLabel} ${hover}${
              !thematic && values[hover] != null
                ? ` · ${metricNumber.format(
                    values[hover]!
                  )} ${unit}`
                : ''
            }`
          : 'WGS 84'}
      </div>
    </div>
  )
}
