import type { ChartMarkerShape } from './chartStyles'

export default function ChartMarker({ shape = 'circle', color, cx = 0, cy = 0, active = false }: {
  shape?: ChartMarkerShape
  color: string
  cx?: number
  cy?: number
  active?: boolean
}) {
  const radius = active ? 5.5 : 3.5
  return <g className="scenario-dot" data-cx={cx} data-cy={cy} data-marker={shape} transform={`translate(${cx}, ${cy})`} fill={color} stroke="#fffefa" strokeWidth={1}>
    {shape === 'circle' ? <circle r={radius} />
      : shape === 'square' ? <rect x={-radius} y={-radius} width={radius * 2} height={radius * 2} />
        : shape === 'triangle' ? <path d={`M0,${-radius * 1.3} L${radius * 1.2},${radius} H${-radius * 1.2} Z`} />
          : <path d={`M0,${-radius * 1.4} L${radius * 1.2},0 0,${radius * 1.4} ${-radius * 1.2},0 Z`} />}
  </g>
}
