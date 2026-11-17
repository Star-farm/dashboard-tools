import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts'
import ChartUnitLabel from '../../components/ChartUnitLabel'
import type { Language } from '../../i18n'
import { soilText } from './soilText'
import { soilUnknownColor } from './soilTypes'
import type { SoilLayer, SoilLayerInfo } from './soilTypes'

type AreaSlice = { name: string; color: string; area: number }

function positionSlices(slices: AreaSlice[], total: number) {
  let cumulativeArea = 0
  return slices.map((slice) => {
    const angle = -(cumulativeArea + slice.area / 2) / total * 2 * Math.PI
    cumulativeArea += slice.area
    return { slice, side: Math.cos(angle) >= 0 ? 'right' as const : 'left' as const, vertical: Math.sin(angle) }
  })
}

export default function SoilAreaChart({ layer, layerId, selectedLayer, selectedPlot, language, failed }: {
  layer?: SoilLayer; layerId: string; selectedLayer: SoilLayerInfo; selectedPlot: number | null; language: Language; failed?: boolean
}) {
  const t = soilText[language]
  const plots = layer?.plots.filter((plot) => selectedPlot === null || plot.id === selectedPlot) ?? []
  const total = plots.reduce((sum, plot) => sum + plot.areaHa, 0)
  const unknownArea = plots.reduce((sum, plot) => sum + plot.unknownAreaHa, 0)
  const slices = layer ? layer.categories.map((category) => ({ name: category.label[language], color: category.color, area: plots.reduce((sum, plot) => sum + (plot.shares.find((share) => share.categoryId === category.id)?.areaHa ?? 0), 0) + (layerId === 'landuse' && category.id === '10' ? unknownArea : 0) })).concat(layerId === 'landuse' ? [] : [{ name: t.unknown, color: soilUnknownColor, area: unknownArea }]) : []
  const number = new Intl.NumberFormat(language, { maximumFractionDigits: 1 })
  const smallArea = slices.filter((slice) => slice.area > 0 && slice.area / total < 0.01).reduce((sum, slice) => sum + slice.area, 0)
  const visibleSlices = layerId === 'landuse'
    ? slices.filter((slice) => slice.area > 0)
    : [...slices.filter((slice) => slice.area > 0 && slice.area / total >= 0.01), ...(smallArea > 0 ? [{ name: language === 'vi' ? 'Khác' : 'Other', color: '#66736c', area: smallArea }] : [])]
  const listedSlices = layerId === 'landuse' ? [...slices].sort((a, b) => b.area - a.area) : visibleSlices
  const positions = positionSlices(visibleSlices, total)
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
  const percentage = (area: number) => area / total * 100 < 0.1 ? `< ${number.format(0.1)} %` : `${number.format(area / total * 100)} %`
  return <aside className={`soil-chart${layerId === 'flooding' ? ' soil-chart-flooding' : ''}`} aria-live="polite"><h3>{language === 'vi' ? 'Tỷ lệ diện tích' : 'Area composition'}</h3><p>{selectedPlot === null ? (language === 'vi' ? 'Toàn bộ bản đồ' : 'Entire map') : `${t.plot} ${selectedPlot}`} · {selectedLayer.title[language]}</p>{layer && total > 0 && !failed ? <><div className="soil-chart-figure" style={{ height: Math.max(240, labelCount * 22 + 50), flexBasis: Math.max(240, labelCount * 22 + 50) }} role="img" aria-label={visibleSlices.map((slice) => `${slice.name}: ${percentage(slice.area)}`).join('; ')}><ChartUnitLabel unit="%" /><ResponsiveContainer width="100%" height="100%"><PieChart key={`${layerId}-${selectedPlot ?? "all"}`}><Pie data={visibleSlices} dataKey="area" nameKey="name" innerRadius="45%" outerRadius="72%" isAnimationActive={false} labelLine={false} label={({ cx, cy, midAngle, innerRadius, outerRadius, value, index }) => { const angle = -Number(midAngle) * Math.PI / 180; const x = Number(cx), y = Number(cy), outer = Number(outerRadius), small = Number(value) / total < 0.08; const radius = (Number(innerRadius) + outer) / 2; const position = positions[Number(index)]; if (!position) return null; const right = Math.cos(angle) >= 0; const labels = right ? rightLabels : leftLabels; const rank = labels.indexOf(position); const direction = right ? 1 : -1; const tx = small ? x + direction * (outer + 17) : x + radius * Math.cos(angle); const ty = small ? y + (labelOffsets(labels, outer)[rank] ?? 0) : y + radius * Math.sin(angle); const edgeX = x + outer * Math.cos(angle), edgeY = y + outer * Math.sin(angle); return <g>{small && <><polyline points={`${edgeX},${edgeY} ${x + direction * (outer + 8)},${ty} ${tx - direction * 3},${ty}`} fill="none" stroke={position.slice.color} strokeWidth={2} /><circle cx={edgeX} cy={edgeY} r={2} fill={position.slice.color} /></>}<text x={tx} y={ty} textAnchor={small ? (right ? 'start' : 'end') : 'middle'} dominantBaseline="central" fill={small ? '#203e2d' : '#fff'} stroke={small ? '#f7f8f1' : '#34483b'} strokeWidth={3} paintOrder="stroke" fontSize={13} fontWeight={700}>{percentage(Number(value))}</text></g> }}>{visibleSlices.map((slice) => <Cell key={slice.name} fill={slice.color} />)}</Pie></PieChart></ResponsiveContainer></div><p className="chart-legend-caption">{language === 'vi' ? '\u0043h\u00fa gi\u1ea3i' : 'Legend'}</p><ul className={`soil-chart-list${layerId === 'landuse' ? ' soil-chart-list-scroll' : ''}`}>{listedSlices.slice(0, 10).map((slice) => <li key={slice.name}><span><i style={{ background: slice.color }} />{slice.name}</span><strong>{percentage(slice.area)}</strong></li>)}</ul>{listedSlices.length > 10 && <details className="soil-chart-more"><summary>{language === 'vi' ? 'Xem thêm' : 'Show more'} ({listedSlices.length - 10})</summary><ul>{listedSlices.slice(10).map((slice) => <li key={slice.name}><span><i style={{ background: slice.color }} />{slice.name}</span><strong>{percentage(slice.area)}</strong></li>)}</ul></details>}<p>{language === 'vi' ? 'Tỷ lệ tính theo diện tích ranh giới bản đồ xấp xỉ.' : 'Percentages use approximate mapped boundary areas.'}</p></> : <p>{failed ? t.error : t.loading}</p>}</aside>
}

