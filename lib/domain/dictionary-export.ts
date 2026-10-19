import { genderInfo } from "./gender";
import type { DictWord } from "./dictionary";
import { posLabel } from "./page-lookup";

/** RF-32: CSV en UTF-8 con BOM (Excel) y `;` como separador (Excel en español y Anki lo detectan). */
export const BOM = "\uFEFF";
const SEP = ";";
const HEADER = ["artículo", "lema", "tipo", "significados", "estado", "consultas", "libro"];

function cell(value: string): string {
  // Una celda que empieza con = + - @ se interpretaría como fórmula en Excel.
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[;"\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export function toCsv(words: DictWord[], bookTitles: Record<string, string>): string {
  const rows = words.map((w) => {
    const info = genderInfo(w);
    return [
      info.kind === "colored" ? info.articles.join("/") : "",
      w.lemma,
      posLabel(w.pos),
      w.glosses.join(", "),
      w.status === "known" ? "conocida" : "vista",
      String(w.lookups),
      w.bookId ? (bookTitles[w.bookId] ?? "") : "",
    ];
  });
  return BOM + [HEADER, ...rows].map((r) => r.map(cell).join(SEP)).join("\r\n") + "\r\n";
}
