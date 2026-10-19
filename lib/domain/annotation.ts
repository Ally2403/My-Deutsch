/** RN-13: las respuestas escritas se guardan en coordenadas relativas (0–1) a la página. */
export const MAX_TEXT = 2000;

export type Annotation = {
  id: string;
  page: number;
  x: number;
  y: number;
  text: string;
  kind: "free" | "field";
};

export function clampRel(v: number): number {
  if (!Number.isFinite(v)) return 0;
  return Math.min(Math.max(v, 0), 1);
}

type Rect = { left: number; top: number; width: number; height: number };

/** Punto de pantalla → fracción de la página; no depende del tamaño en que se muestre. */
export function pointToRel(clientX: number, clientY: number, rect: Rect) {
  if (rect.width <= 0 || rect.height <= 0) return { x: 0, y: 0 };
  return {
    x: clampRel((clientX - rect.left) / rect.width),
    y: clampRel((clientY - rect.top) / rect.height),
  };
}

export function sanitizeText(text: string): string {
  return text.slice(0, MAX_TEXT);
}
