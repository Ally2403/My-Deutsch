import { THEME_KEY, parseTheme, type ThemePref } from "./theme";

/** RF-37: preferencias de lectura guardadas en `profiles.prefs` y aplicadas en todos los dispositivos. */
export const FONT_SIZES = ["sm", "md", "lg", "xl"] as const;
export type FontSize = (typeof FONT_SIZES)[number];

export type Prefs = {
  theme: ThemePref;
  /** Tamaño de letra del modo lectura (RF-18). */
  fontSize: FontSize;
  /** Coloreo de sustantivos por defecto. */
  highlight: boolean;
  /** Marcas de palabras «vistas» por defecto. */
  seenMarks: boolean;
};

export const DEFAULT_PREFS: Prefs = {
  theme: "system",
  fontSize: "md",
  highlight: false,
  seenMarks: true,
};

export const FONT_SIZE_KEY = "my-deutsch:font-size";

export function parseFontSize(raw: unknown): FontSize {
  return FONT_SIZES.find((s) => s === raw) ?? DEFAULT_PREFS.fontSize;
}

export function parsePrefs(raw: unknown): Prefs {
  const o = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  return {
    theme: parseTheme(typeof o.theme === "string" ? o.theme : null),
    fontSize: parseFontSize(o.fontSize),
    highlight: typeof o.highlight === "boolean" ? o.highlight : DEFAULT_PREFS.highlight,
    seenMarks: typeof o.seenMarks === "boolean" ? o.seenMarks : DEFAULT_PREFS.seenMarks,
  };
}

export function mergePrefs(base: Partial<Prefs>, patch: Partial<Prefs>): Prefs {
  return parsePrefs({ ...base, ...patch });
}

/** Valores de `localStorage` equivalentes; `null` significa «borrar la clave». */
export function toLocalEntries(p: Prefs): Record<string, string | null> {
  return {
    [THEME_KEY]: p.theme === "system" ? null : p.theme,
    "my-deutsch:highlight": p.highlight ? "1" : "0",
    "my-deutsch:hide-seen": p.seenMarks ? "0" : "1",
    [FONT_SIZE_KEY]: p.fontSize,
  };
}
