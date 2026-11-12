import { useMemo, useState } from 'react'
import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts'
import type { Language } from '../../i18n'
import type { MapGeometry } from './mapTypes'
import PlotMap from './PlotMap'
import SoilMapShell, { SoilMapLoading } from './SoilMapShell'
import { soilManifest } from './soilManifest'
import { soilText } from './soilText'
import type { SoilData } from './soilTypes'
import { soilUnknownColor } from './soilTypes'
import { useMapFile } from './useMapFile'
import '../../styles/soil-map.css'

const emptyValues: (number | null)[] = []
const emptyBreaks: number[] = []

function compatible(data: SoilData, geometry: MapGeometry) {
  if (data.version !== 1 || data.geometryBasis !== 'dashboard-display' || data.crs !== geometry.crs || data.sourceGeometrySha256 !== geometry.sourceSha256 || !Array.isArray(data.layers) || !data.layers.length) return false
  const plotIds = new Set(geometry.plots.map((plot) => plot.id))
  if (new Set(data.layers.map((layer) => layer.id)).size !== data.layers.length) return false
  return data.layers.every((layer) => {
    if (!Array.isArray(layer.plots) || !Array.isArray(layer.features) || !Array.isArray(layer.categories) || !layer.title?.vi || !layer.title?.en) return false
    const categories = new Set(layer.categories.map((category) => category.id))
    if (categories.size !== layer.categories.length || layer.categories.some((category) => !category.label?.vi || !category.label?.en || typeof category.color !== 'string')) return false
    return layer.plots.length === plotIds.size && new Set(layer.plots.map((plot) => plot.id)).size === plotIds.size && layer.plots.every((plot) =>
      plotIds.has(plot.id) && [plot.areaHa, plot.knownAreaHa, plot.unknownAreaHa].every((area) => Number.isFinite(area) && area >= 0) &&
      Math.abs(plot.areaHa - plot.knownAreaHa - plot.unknownAreaHa) <= Math.max(0.001, plot.areaHa * 0.00001) &&
      Array.isArray(plot.shares) && plot.shares.every((share) => categories.has(share.categoryId) && Number.isFinite(share.areaHa) && share.areaHa >= 0) &&
      new Set(plot.shares.map((share) => share.categoryId)).size === plot.shares.length &&
      Math.abs(plot.shares.reduce((sum, share) => sum + share.areaHa, 0) - plot.knownAreaHa) <= Math.max(0.001, plot.areaHa * 0.00001)
    ) && layer.features.every((feature) => plotIds.has(feature.plotId) && categories.has(feature.categoryId) && typeof feature.path === 'string')
  })
}

export default function SoilMapSection({ geometry, language, geometryError, geometryRetry }: {
  geometry?: MapGeometry; language: Language; geometryError?: boolean; geometryRetry?: () => void
}) {
  const [layerId, setLayerId] = useState('soil_texture')
  const [selectedPlot, setSelectedPlot] = useState<number | null>(null)
  const selectedLayer = soilManifest.layers.find((layer) => layer.id === layerId) ?? soilManifest.layers[0]
  const file = useMapFile<SoilData>(selectedLayer.file)
  const retained = file.data ?? file.previousData
  const t = soilText[language]
  const valid = useMemo(() => {
    try { return !!retained && !!geometry && compatible(retained, geometry) } catch { return false }
  }, [retained, geometry])
  const layer = valid ? retained?.layers.find((item) => item.id === layerId) : undefined
  const displayed = layer ?? (valid ? retained?.layers[0] : undefined)
  const failed = geometryError || file.error || (!!file.data && !!geometry && (!valid || !layer))
  const plots = layer?.plots.filter((plot) => selectedPlot === null || plot.id === selectedPlot) ?? []
  const total = plots.reduce((sum, plot) => sum + plot.areaHa, 0)
  const slices = layer ? [...layer.categories.map((category) => ({ name: category.label[language], color: category.color, area: plots.reduce((sum, plot) => sum + (plot.shares.find((share) => share.categoryId === category.id)?.areaHa ?? 0), 0) })), { name: t.unknown, color: soilUnknownColor, area: plots.reduce((sum, plot) => sum + plot.unknownAreaHa, 0) }] : []
  const number = new Intl.NumberFormat(language, { maximumFractionDigits: 1 })
  const smallArea = slices.filter((slice) => slice.area > 0 && slice.area / total < 0.01).reduce((sum, slice) => sum + slice.area, 0)
  const visibleSlices = [...slices.filter((slice) => slice.area > 0 && slice.area / total >= 0.01), ...(smallArea > 0 ? [{ name: language === 'vi' ? 'Khác' : 'Other', color: '#66736c', area: smallArea }] : [])]
  let cumulativeArea = 0
  const positions = visibleSlices.map((slice) => { const angle = -(cumulativeArea + slice.area / 2) / total * 2 * Math.PI; cumulativeArea += slice.area; return { slice, side: Math.cos(angle) >= 0 ? 'right' : 'left', vertical: Math.sin(angle) } })
  const smallPositions = positions.filter(({ slice }) => slice.area / total < 0.08)
  const leftLabels = smallPositions.filter((item) => item.side === 'left').sort((a, b) => a.vertical - b.vertical)
  const rightLabels = smallPositions.filter((item) => item.side === 'right').sort((a, b) => a.vertical - b.vertical)
  const labelCount = Math.max(leftLabels.length, rightLabels.length)
  const labelOffsets = (labels: typeof smallPositions, outer: number) => {
    const limit = Math.max(outer + 18, labels.length * 11)
    const offsets = labels.map((item) => Math.max(-limit, Math.min(limit, item.vertical * outer)))
    for (let i = 1; i < offsets.length; i++) offsets[i] = Math.max(offsets[i], offsets[i - 1] + 22)
    if (offsets.length && offsets[offsets.length - 1] > limit) offsets[offsets.length - 1] = limit
    for (let i = offsets.length - 2; i >= 0; i--) offsets[i] = Math.min(offsets[i], offsets[i + 1] - 22)
    return offsets
  }
  const percentage = (area: number) => area / total * 100 < 0.1 ? `<${number.format(0.1)}%` : `${number.format(area / total * 100)}%`
  const chart = <aside className={`soil-chart${layerId === 'flooding' ? ' soil-chart-flooding' : ''}`} aria-live="polite"><h3>{language === 'vi' ? 'Tỷ lệ diện tích' : 'Area composition'}</h3><p>{selectedPlot === null ? (language === 'vi' ? 'Toàn bộ bản đồ' : 'Entire map') : `${t.plot} ${selectedPlot}`} · {selectedLayer.title[language]}</p>{layer && total > 0 && !failed ? <><div className="soil-chart-figure" style={{ height: Math.max(240, labelCount * 22 + 50), flexBasis: Math.max(240, labelCount * 22 + 50) }} role="img" aria-label={visibleSlices.map((slice) => `${slice.name}: ${percentage(slice.area)}`).join('; ')}><ResponsiveContainer width="100%" height="100%"><PieChart key={`${layerId}-${selectedPlot ?? "all"}`}><Pie data={visibleSlices} dataKey="area" nameKey="name" innerRadius="45%" outerRadius="72%" isAnimationActive={false} labelLine={false} label={({ cx, cy, midAngle, innerRadius, outerRadius, value, index }) => { const angle = -Number(midAngle) * Math.PI / 180; const x = Number(cx), y = Number(cy), outer = Number(outerRadius), small = Number(value) / total < 0.08; const radius = (Number(innerRadius) + outer) / 2; const position = positions[Number(index)]; if (!position) return null; const right = Math.cos(angle) >= 0; const labels = right ? rightLabels : leftLabels; const rank = labels.indexOf(position); const direction = right ? 1 : -1; const tx = small ? x + direction * (outer + 17) : x + radius * Math.cos(angle); const ty = small ? y + (labelOffsets(labels, outer)[rank] ?? 0) : y + radius * Math.sin(angle); const edgeX = x + outer * Math.cos(angle), edgeY = y + outer * Math.sin(angle); return <g>{small && <><polyline points={`${edgeX},${edgeY} ${x + direction * (outer + 8)},${ty} ${tx - direction * 3},${ty}`} fill="none" stroke={position.slice.color} strokeWidth={2} /><circle cx={edgeX} cy={edgeY} r={2} fill={position.slice.color} /></>}<text x={tx} y={ty} textAnchor={small ? (right ? 'start' : 'end') : 'middle'} dominantBaseline="central" fill={small ? '#203e2d' : '#fff'} stroke={small ? '#f7f8f1' : '#34483b'} strokeWidth={3} paintOrder="stroke" fontSize={13} fontWeight={700}>{percentage(Number(value))}</text></g> }}>{visibleSlices.map((slice) => <Cell key={slice.name} fill={slice.color} />)}</Pie></PieChart></ResponsiveContainer></div><ul className="soil-chart-list">{visibleSlices.slice(0, 10).map((slice) => <li key={slice.name}><span><i style={{ background: slice.color }} />{slice.name}</span><strong>{percentage(slice.area)}</strong></li>)}</ul>{visibleSlices.length > 10 && <details className="soil-chart-more"><summary>{language === 'vi' ? 'Xem thêm' : 'Show more'} ({visibleSlices.length - 10})</summary><ul>{visibleSlices.slice(10).map((slice) => <li key={slice.name}><span><i style={{ background: slice.color }} />{slice.name}</span><strong>{percentage(slice.area)}</strong></li>)}</ul></details>}<p>{language === 'vi' ? 'Tỷ lệ tính theo diện tích ranh giới bản đồ xấp xỉ.' : 'Percentages use approximate mapped boundary areas.'}</p></> : <p>{failed ? t.error : t.loading}</p>}</aside>
  return <SoilMapShell language={language} layerId={layerId} onLayerChange={setLayerId} chart={chart}>
    {geometry && displayed ? <div inert={!layer || !!failed} aria-hidden={!layer || !!failed}><PlotMap geometry={geometry} language={language} thematic={displayed} rasterFile={layer ? selectedLayer.rasterFile : undefined} onSelectionChange={setSelectedPlot} values={emptyValues} metric="yield" breaks={emptyBreaks} yieldValues={emptyValues} incomeValues={emptyValues} periodLabel="" scenarioLabel="" /></div> : <SoilMapLoading language={language} />}
    {failed ? <div className="map-loading-overlay"><div className="map-error" role="alert"><p>{t.error}</p><button type="button" className="primary-button" onClick={() => geometryError ? geometryRetry?.() : file.retry()}>{t.retry}</button></div></div>
      : !layer && displayed && <div className="map-loading-overlay" role="status">{t.loading}</div>}
  </SoilMapShell>
}
