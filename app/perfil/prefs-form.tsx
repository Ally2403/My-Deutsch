"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import { FONT_SIZES, parseFontSize, type FontSize, type Prefs } from "@/lib/domain/prefs";
import { THEME_LABEL, parseTheme } from "@/lib/domain/theme";
import { applyLocal, savePrefs } from "@/lib/prefs/client";

const FONT_LABEL: Record<FontSize, string> = {
  sm: "Pequeño",
  md: "Mediano",
  lg: "Grande",
  xl: "Muy grande",
};

const selectClass = "min-h-11 rounded-control border border-border bg-surface px-3 text-base";

/** RF-37: preferencias de lectura que siguen a la persona en todos sus dispositivos. */
export function PrefsForm({ initial }: { initial: Prefs }) {
  const [prefs, setPrefs] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const ok = await savePrefs(prefs);
    setBusy(false);
    if (ok) applyLocal(prefs);
    setStatus(ok ? "saved" : "error");
  }

  return (
    <form onSubmit={onSubmit} className="card mt-4 flex flex-col gap-4 p-5">
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Tema
        <select
          value={prefs.theme}
          onChange={(e) => setPrefs({ ...prefs, theme: parseTheme(e.target.value) })}
          className={selectClass}
        >
          {Object.entries(THEME_LABEL).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Tamaño de letra del modo lectura
        <select
          value={prefs.fontSize}
          onChange={(e) => setPrefs({ ...prefs, fontSize: parseFontSize(e.target.value) })}
          className={selectClass}
        >
          {FONT_SIZES.map((s) => (
            <option key={s} value={s}>
              {FONT_LABEL[s]}
            </option>
          ))}
        </select>
      </label>
      <label className="flex min-h-11 items-center gap-3 text-sm font-medium">
        <input
          type="checkbox"
          className="size-5"
          checked={prefs.highlight}
          onChange={(e) => setPrefs({ ...prefs, highlight: e.target.checked })}
        />
        Colorear sustantivos por defecto
      </label>
      <label className="flex min-h-11 items-center gap-3 text-sm font-medium">
        <input
          type="checkbox"
          className="size-5"
          checked={prefs.seenMarks}
          onChange={(e) => setPrefs({ ...prefs, seenMarks: e.target.checked })}
        />
        Marcar palabras vistas por defecto
      </label>
      {status === "error" && (
        <p role="alert" className="text-danger">
          No se pudieron guardar las preferencias. Inténtalo de nuevo.
        </p>
      )}
      {status === "saved" && <p role="status">Preferencias guardadas.</p>}
      <Button type="submit" loading={busy} className="self-start">
        Guardar preferencias
      </Button>
    </form>
  );
}
