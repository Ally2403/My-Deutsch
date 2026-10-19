/** RF-19: zoom y ajuste de página (lógica pura). */

export const MIN_ZOOM = 1;
export const MAX_ZOOM = 4;
export const DOUBLE_TAP_ZOOM = 2;
const ZOOMED = 1.05;

export type Fit = "width" | "height";

export function clampZoom(z: number): number {
  if (!Number.isFinite(z)) return MIN_ZOOM;
  return Math.min(Math.max(z, MIN_ZOOM), MAX_ZOOM);
}

/** Doble toque: de «ajustada» pasa a 2×; con zoom vuelve a ajustada (RF-19 c2). */
export function doubleTapZoom(z: number): number {
  return z > ZOOMED ? MIN_ZOOM : DOUBLE_TAP_ZOOM;
}

/** Mientras hay zoom, deslizar desplaza la página en lugar de cambiarla (RF-19 c1). */
export function swipeChangesPage(z: number): boolean {
  return z <= ZOOMED;
}

/** Pellizco: escala el zoom inicial por la razón entre la distancia actual y la inicial. */
export function pinchZoom(startZoom: number, startDistance: number, distance: number): number {
  if (startDistance <= 0) return clampZoom(startZoom);
  return clampZoom(startZoom * (distance / startDistance));
}

/** Rueda con Ctrl (RF-19): cada muesca multiplica el zoom; deltaY < 0 acerca. */
export function wheelZoom(z: number, deltaY: number): number {
  return clampZoom(z * Math.exp(-deltaY * 0.01));
}

/** Ancho en px de la página sin zoom: al ancho de la pantalla (con tope) o al alto disponible. */
export function baseWidth(a: {
  fit: Fit;
  viewport: { w: number; h: number };
  aspect: number;
  maxWidth?: number;
}): number {
  const maxW = a.maxWidth ?? 900;
  const byWidth = Math.min(a.viewport.w, maxW);
  if (a.fit === "width") return byWidth;
  return Math.min(a.viewport.h * a.aspect, a.viewport.w);
}

export function distance(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}
