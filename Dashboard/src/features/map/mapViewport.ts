export interface MapViewport { zoom: number; x: number; y: number }
export const MAX_MAP_ZOOM = 20

export function zoomViewport(view: MapViewport, factor: number, anchor: { x: number; y: number } = view): MapViewport {
  const zoom = Math.max(1, Math.min(MAX_MAP_ZOOM, view.zoom * factor))
  return { zoom, x: anchor.x + (view.x - anchor.x) * view.zoom / zoom, y: anchor.y + (view.y - anchor.y) * view.zoom / zoom }
}
