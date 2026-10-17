"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { highlightFor } from "@/lib/domain/noun-highlight";
import type { PageData } from "@/lib/domain/page";
import {
  clampPage,
  keyDirection,
  parsePageInput,
  prefetchTargets,
  swipeDirection,
  type Direction,
} from "@/lib/domain/paging";
import { pairOf } from "@/lib/domain/page-lookup";
import { TextLayer } from "./text-layer";
import { useHighlightPref } from "./use-highlight-pref";
import { WordPanel } from "./word-panel";

type Props = {
  total: number;
  loadPage: (n: number) => Promise<PageData>;
  imageUrl: (n: number) => string;
};

const DEFAULT_ASPECT = 1600 / 2263;

export function PageReader({ total, loadPage, imageUrl }: Props) {
  const [page, setPage] = useState(1);
  const [loaded, setLoaded] = useState<{ n: number; data: PageData } | null>(
    null,
  );
  const [failed, setFailed] = useState<{ n: number; attempt: number } | null>(
    null,
  );
  const [attempt, setAttempt] = useState(0);
  const [input, setInput] = useState("");
  const [inputError, setInputError] = useState(false);
  const [highlightOn, setHighlightOn] = useHighlightPref();
  const [selected, setSelected] = useState<{
    page: number;
    token: number;
    rect: DOMRect;
  } | null>(null);
  const cache = useRef(new Map<number, Promise<PageData>>());
  const swipeStart = useRef<{ x: number; y: number } | null>(null);

  const getPage = useCallback(
    (n: number) => {
      let p = cache.current.get(n);
      if (!p) {
        p = loadPage(n);
        cache.current.set(n, p);
        p.catch(() => cache.current.delete(n));
      }
      return p;
    },
    [loadPage],
  );

  const go = useCallback(
    (dir: Direction) =>
      setPage((p) => clampPage(dir === "next" ? p + 1 : p - 1, total)),
    [total],
  );

  // Carga la página actual y precarga las vecinas (RF-16 c4).
  useEffect(() => {
    let cancelled = false;
    getPage(page).then(
      (data) => {
        if (!cancelled) setLoaded({ n: page, data });
      },
      () => {
        if (!cancelled) setFailed({ n: page, attempt });
      },
    );
    for (const n of prefetchTargets(page, total)) {
      getPage(n).catch(() => {});
      new Image().src = imageUrl(n);
    }
    return () => {
      cancelled = true;
    };
  }, [page, attempt, total, getPage, imageUrl]);

  // Flechas y AvPág/RePág (RF-16 c2).
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target;
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      if (t instanceof Element && t.closest("input, textarea, select")) return;
      const dir = keyDirection(e.key);
      if (dir) go(dir);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go]);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const n = parsePageInput(input, total);
    setInputError(n === null);
    if (n !== null) {
      setPage(n);
      setInput("");
    }
  }

  const data = loaded?.n === page ? loaded.data : null;
  const error = failed?.n === page && failed.attempt === attempt;
  const open = data && selected?.page === page ? selected : null;
  const pair = open ? pairOf(data!, open.token) : null;
  const active = open
    ? new Set(pair === null ? [open.token] : [open.token, pair])
    : undefined;
  const highlight = useMemo(
    () => (data && highlightOn ? highlightFor(data) : undefined),
    [data, highlightOn],
  );
  const aspect = data ? data.size[0] / data.size[1] : DEFAULT_ASPECT;

  return (
    <div className="flex h-dvh flex-col">
      <div className="flex justify-end border-b border-border px-3 py-1">
        <button
          type="button"
          aria-pressed={highlightOn}
          onClick={() => setHighlightOn(!highlightOn)}
          className={
            "min-h-11 rounded border px-3 text-sm " +
            (highlightOn
              ? "border-accent bg-accent/10 font-medium"
              : "border-border")
          }
        >
          Colorear sustantivos
        </button>
      </div>
      <div
        className="flex-1 touch-pan-y overflow-auto p-2"
        onPointerDown={(e) => {
          swipeStart.current =
            e.pointerType === "touch" ? { x: e.clientX, y: e.clientY } : null;
        }}
        onPointerUp={(e) => {
          const s = swipeStart.current;
          swipeStart.current = null;
          if (!s) return;
          const dir = swipeDirection({
            startX: s.x,
            dx: e.clientX - s.x,
            dy: e.clientY - s.y,
            width: window.innerWidth,
          });
          if (dir) go(dir);
        }}
      >
        <div
          className="relative mx-auto w-full max-w-[900px] bg-white shadow"
          style={{ aspectRatio: aspect, containerType: "inline-size" }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- WebP estático con tamaño propio */}
          <img
            src={imageUrl(page)}
            alt={`Imagen de la página ${page}`}
            className="absolute inset-0 h-full w-full select-none"
            draggable={false}
          />
          {data && (
            <TextLayer
              page={data}
              active={active}
              highlight={highlight}
              onWordClick={(token, rect) => setSelected({ page, token, rect })}
            />
          )}
          <button
            type="button"
            tabIndex={-1}
            aria-hidden="true"
            className="absolute inset-y-0 left-0 w-[8%]"
            onClick={() => go("prev")}
          />
          <button
            type="button"
            tabIndex={-1}
            aria-hidden="true"
            className="absolute inset-y-0 right-0 w-[8%]"
            onClick={() => go("next")}
          />
          {error && (
            <div
              role="alert"
              className="absolute inset-x-4 top-4 rounded border border-border bg-background p-3 text-sm"
            >
              No se pudo cargar la página.{" "}
              <button
                type="button"
                className="min-h-11 font-medium underline"
                onClick={() => {
                  cache.current.delete(page);
                  setFailed(null);
                  setAttempt((a) => a + 1);
                }}
              >
                Reintentar
              </button>
            </div>
          )}
        </div>
      </div>

      {data && open && (
        <WordPanel
          page={data}
          tokenIndex={open.token}
          pageNumber={page}
          anchor={open.rect}
          onClose={() => setSelected(null)}
        />
      )}

      <nav
        aria-label="Páginas"
        className="flex items-center justify-between gap-2 border-t border-border px-3 py-2"
        style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
      >
        <button
          type="button"
          aria-label="Página anterior"
          disabled={page <= 1}
          onClick={() => go("prev")}
          className="min-h-11 min-w-11 rounded border border-border disabled:opacity-40"
        >
          ←
        </button>
        <form onSubmit={onSubmit} className="flex items-center gap-2">
          <span
            aria-live="polite"
            className="text-sm"
          >{`página ${page} de ${total}`}</span>
          <label className="sr-only" htmlFor="reader-goto">
            Ir a la página
          </label>
          <input
            id="reader-goto"
            inputMode="numeric"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            aria-invalid={inputError}
            className="min-h-11 w-16 rounded border border-border bg-background px-2 text-center"
          />
          <button
            type="submit"
            className="min-h-11 rounded border border-border px-3"
          >
            Ir
          </button>
        </form>
        <button
          type="button"
          aria-label="Página siguiente"
          disabled={page >= total}
          onClick={() => go("next")}
          className="min-h-11 min-w-11 rounded border border-border disabled:opacity-40"
        >
          →
        </button>
      </nav>
      {inputError && (
        <p role="alert" className="px-3 pb-2 text-sm text-gender-f">
          Escribe un número entre 1 y {total}.
        </p>
      )}
    </div>
  );
}
