"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  canTranslatePhrase,
  tokenRangeFromSelection,
  type TokenRange,
} from "@/lib/domain/phrase";

export type PhraseSelection = { range: TokenRange; rect: DOMRect | null };

function tokenOf(node: Node | null, layer: HTMLElement): number | null {
  const el = node instanceof Element ? node : (node?.parentElement ?? null);
  const host = el?.closest<HTMLElement>("[data-token]");
  if (!host || !layer.contains(host)) return null;
  const n = Number(host.dataset.token);
  return Number.isInteger(n) ? n : null;
}

/** RF-47: selección de varias palabras con el mouse sobre la capa de texto. Al soltar el botón
 * mapea el inicio y el final de la selección nativa a índices de token. Con `enabled` en falso
 * (modo «Escribir», lectura) no hace nada. Una sola palabra no cuenta como frase. */
export function usePhraseSelection(
  layerRef: React.RefObject<HTMLElement | null>,
  {
    enabled,
    onSelect,
  }: {
    enabled: boolean;
    /** Se llama al terminar una selección de varias palabras. */
    onSelect?: (range: TokenRange, rect: DOMRect | null) => void;
  },
): { selection: PhraseSelection | null; clear: () => void } {
  const [selection, setSelection] = useState<PhraseSelection | null>(null);
  const onSelectRef = useRef(onSelect);
  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  const clear = useCallback(() => {
    setSelection(null);
    window.getSelection?.()?.removeAllRanges();
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const onPointerUp = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      const layer = layerRef.current;
      const sel = window.getSelection?.();
      if (!layer || !sel || sel.isCollapsed) return;
      const a = tokenOf(sel.anchorNode, layer);
      const f = tokenOf(sel.focusNode, layer);
      if (a === null || f === null) return;
      const range = tokenRangeFromSelection(a, f);
      if (!canTranslatePhrase(range)) return;
      const rect =
        sel.rangeCount > 0 ? sel.getRangeAt(0).getBoundingClientRect() : null;
      // La selección nativa se quita para que no quede atrapada al cerrar el panel.
      sel.removeAllRanges();
      setSelection({ range, rect });
      onSelectRef.current?.(range, rect);
    };
    document.addEventListener("pointerup", onPointerUp);
    return () => document.removeEventListener("pointerup", onPointerUp);
  }, [enabled, layerRef]);

  return { selection: enabled ? selection : null, clear };
}
