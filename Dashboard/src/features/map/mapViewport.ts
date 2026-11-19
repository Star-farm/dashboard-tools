export interface MapViewport { zoom: number; x: number; y: number }
export const MIN_MAP_ZOOM = 1
export const DEFAULT_MAP_ZOOM = 3.75
export const MAX_MAP_ZOOM = 120

export function zoomViewport(view: MapViewport, factor: number, anchor: { x: number; y: number } = view): MapViewport {
  const zoom = Math.max(MIN_MAP_ZOOM, Math.min(MAX_MAP_ZOOM, view.zoom * factor))
  return { zoom, x: anchor.x + (view.x - anchor.x) * view.zoom / zoom, y: anchor.y + (view.y - anchor.y) * view.zoom / zoom }
}
