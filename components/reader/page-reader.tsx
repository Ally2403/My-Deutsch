"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { highlightFor, pluralFor } from "@/lib/domain/noun-highlight";
import type { LexEntry, PageData } from "@/lib/domain/page";
import {
  clampPage,
  keyDirection,
  parsePageInput,
  prefetchTargets,
  swipeDirection,
  type Direction,
} from "@/lib/domain/paging";
import { pairOf } from "@/lib/domain/page-lookup";
import {
  seenMarksFor,
  type SeenMap,
  type SeenWord,
} from "@/lib/domain/seen-words";
import {
  baseWidth,
  clampZoom,
  distance,
  doubleTapZoom,
  pinchZoom,
  swipeChangesPage,
  wheelZoom,
  type Fit,
} from "@/lib/domain/zoom";
import { Icon } from "@/components/icons";
import type { AnnotationSync, SyncStatus } from "@/lib/annotations/sync";
import { AnnotationLayer } from "./annotation-layer";
import { TextLayer } from "./text-layer";
import {
  useHideAnswersPref,
  useHideSeenPref,
  useHighlightPref,
  usePluralPref,
} from "./use-highlight-pref";
import { WordPanel } from "./word-panel";

type Props = {
  total: number;
  loadPage: (n: number) => Promise<PageData>;
  imageUrl: (n: number) => string;
  /** Clase de alto del contenedor; por omisión ocupa toda la pantalla. */
  heightClassName?: string;
  /** Página en la que se abre (RF-20); 1 por omisión. */
  initialPage?: number;
  /** Se llama al abrir y en cada cambio de página (RF-20). */
  onPageChange?: (page: number) => void;
  /** RF-28: palabras del diccionario personal (por id de léxico) y títulos de sus primeros libros. */
  seenWords?: SeenMap;
  seenBookTitles?: Record<string, string>;
  /** RF-29: cambiar el estado o eliminar una palabra desde el panel. */
  onSeenStatus?: (lexiconId: number, status: SeenWord["status"]) => void;
  onSeenRemove?: (lexiconId: number) => void;
  /** RF-25: buscar de nuevo una forma corregida de una palabra sin entrada. */
  searchLexicon?: (word: string) => Promise<LexEntry | null>;
  /** RF-33, RNF-14: respuestas escritas sobre la página con guardado local y sincronizado. */
  annotations?: AnnotationSync;
};

const DEFAULT_ASPECT = 1600 / 2263;

export function PageReader({
  total,
  loadPage,
  imageUrl,
  heightClassName = "h-dvh",
  initialPage = 1,
  onPageChange,
  seenWords,
  seenBookTitles,
  onSeenStatus,
  onSeenRemove,
  searchLexicon,
  annotations,
}: Props) {
  const [page, setPage] = useState(() => clampPage(initialPage, total));
  const [loaded, setLoaded] = useState<{ n: number; data: PageData } | null>(
    null,
  );
  const [failed, setFailed] = useState<{
    n: number;
    attempt: number;
    message: string | null;
  } | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [input, setInput] = useState("");
  const [inputError, setInputError] = useState(false);
  const [highlightOn, setHighlightOn] = useHighlightPref();
  const [pluralsOn, setPluralsOn] = usePluralPref();
  const [hideSeen, setHideSeen] = useHideSeenPref();
  const [hideAnswers, setHideAnswers] = useHideAnswersPref();
  const [writeMode, setWriteMode] = useState(false);
  const [answersVersion, setAnswersVersion] = useState(0);
  const syncStatus: SyncStatus = useSyncExternalStore(
    (cb) => annotations?.onStatus(cb) ?? (() => {}),
    () => annotations?.status() ?? "saved",
    () => "saved",
  );
  const [selected, setSelected] = useState<{
    page: number;
    token: number;
    rect: DOMRect;
  } | null>(null);
  const cache = useRef(new Map<number, Promise<PageData>>());
  const swipeStart = useRef<{ x: number; y: number } | null>(null);

  // RF-19: zoom y ajuste de página.
  const [zoom, setZoomState] = useState(1);
  const [fit, setFit] = useState<Fit>("width");
  const [viewport, setViewport] = useState<{ w: number; h: number } | null>(
    null,
  );
  const scroller = useRef<HTMLDivElement | null>(null);
  const zoomRef = useRef(1);
  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);
  const keepCenter = useRef<{ x: number; y: number } | null>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ dist: number; zoom: number } | null>(null);
  const lastTap = useRef<{ t: number; x: number; y: number } | null>(null);

  const setZoom = useCallback((next: number) => {
    const el = scroller.current;
    if (el && el.scrollWidth > 0 && el.scrollHeight > 0)
      keepCenter.current = {
        x: (el.scrollLeft + el.clientWidth / 2) / el.scrollWidth,
        y: (el.scrollTop + el.clientHeight / 2) / el.scrollHeight,
      };
    setZoomState(clampZoom(next));
  }, []);

  // Mantiene el centro de la vista al cambiar el zoom.
  useLayoutEffect(() => {
    const el = scroller.current;
    const c = keepCenter.current;
    keepCenter.current = null;
    if (!el || !c) return;
    el.scrollLeft = c.x * el.scrollWidth - el.clientWidth / 2;
    el.scrollTop = c.y * el.scrollHeight - el.clientHeight / 2;
  }, [zoom]);

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
      (e: unknown) => {
        const message = e instanceof Error && e.message ? e.message : null;
        if (!cancelled) setFailed({ n: page, attempt, message });
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

  useEffect(() => {
    const el = scroller.current;
    if (el) {
      el.scrollTop = 0;
      el.scrollLeft = 0;
    }
  }, [page]);

  useEffect(() => {
    onPageChange?.(page);
  }, [page, onPageChange]);

  // Tamaño disponible para la página (RF-19: ajustar al ancho o al alto).
  const scrollerRef = useCallback((el: HTMLDivElement | null) => {
    scroller.current = el;
  }, []);
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const measure = () =>
      setViewport({
        w: Math.max(el.clientWidth - 16, 1),
        h: Math.max(el.clientHeight - 16, 1),
      });
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Rueda con Ctrl: zoom en la página en lugar del zoom del navegador (RF-19).
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey) return;
      e.preventDefault();
      setZoom(wheelZoom(zoomRef.current, e.deltaY));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [setZoom]);

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
  const error = !data && failed?.n === page && failed.attempt === attempt;
  const errorMessage = error ? failed.message : null;
  const open = data && selected?.page === page ? selected : null;
  const pair = open ? pairOf(data!, open.token) : null;
  const active = open
    ? new Set(pair === null ? [open.token] : [open.token, pair])
    : undefined;
  const highlight = useMemo(
    () => (data && highlightOn ? highlightFor(data) : undefined),
    [data, highlightOn],
  );
  const plurals = useMemo(
    () => (data && pluralsOn ? pluralFor(data) : undefined),
    [data, pluralsOn],
  );
  const seenMarks = useMemo(
    () =>
      data && seenWords && !hideSeen
        ? seenMarksFor(data, seenWords)
        : undefined,
    [data, seenWords, hideSeen],
  );
  const aspect = data ? data.size[0] / data.size[1] : DEFAULT_ASPECT;

  return (
    <div className={`flex ${heightClassName} min-h-0 flex-col`}>
      <div className="flex items-center gap-3 overflow-x-auto border-b border-border bg-surface px-3 py-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [mask-image:linear-gradient(to_right,black_calc(100%-2rem),transparent)] md:[mask-image:none]">
        <div
          className="flex shrink-0 items-center gap-2 md:ml-auto"
          role="group"
          aria-label="Marcas"
        >
          <button
            type="button"
            aria-pressed={pluralsOn}
            onClick={() => setPluralsOn(!pluralsOn)}
            className="chip"
          >
            Marcar plurales
          </button>
          <button
            type="button"
            aria-pressed={highlightOn}
            onClick={() => setHighlightOn(!highlightOn)}
            className="chip"
          >
            Colorear sustantivos
          </button>
          {seenWords && (
            <button
              type="button"
              aria-pressed={!hideSeen}
              onClick={() => setHideSeen(!hideSeen)}
              className="chip"
            >
              Marcar palabras vistas
            </button>
          )}
        </div>
        <div
          className="flex shrink-0 items-center gap-2 md:mr-auto"
          role="group"
          aria-label="Zoom"
        >
          <button
            type="button"
            aria-pressed={fit === "width" && zoom === 1}
            onClick={() => {
              setFit("width");
              setZoom(1);
            }}
            className="chip"
          >
            Ajustar al ancho
          </button>
          <button
            type="button"
            aria-pressed={fit === "height" && zoom === 1}
            onClick={() => {
              setFit("height");
              setZoom(1);
            }}
            className="chip"
          >
            Ajustar al alto
          </button>
          <button
            type="button"
            aria-label="Alejar"
            disabled={zoom <= 1}
            onClick={() => setZoom(zoom / 1.25)}
            className="chip chip-icon"
          >
            <Icon name="minus" />
          </button>
          <span aria-live="polite" className="min-w-12 text-center text-sm">
            {Math.round(zoom * 100)} %
          </span>
          <button
            type="button"
            aria-label="Acercar"
            disabled={zoom >= 4}
            onClick={() => setZoom(zoom * 1.25)}
            className="chip chip-icon"
          >
            <Icon name="plus" />
          </button>
        </div>
        {annotations && (
          <div className="flex shrink-0 items-center gap-2" role="group" aria-label="Respuestas">
            <button
              type="button"
              aria-pressed={writeMode}
              onClick={() => {
                if (!writeMode && hideAnswers) setHideAnswers(false);
                setWriteMode(!writeMode);
              }}
              className="chip"
            >
              Escribir
            </button>
            <button
              type="button"
              aria-pressed={!hideAnswers}
              onClick={() => setHideAnswers(!hideAnswers)}
              className="chip"
            >
              Mis respuestas
            </button>
            <button
              type="button"
              onClick={() => {
                if (
                  window.confirm(
                    "¿Borrar todas tus respuestas de esta página? Las de otras personas no cambian.",
                  )
                )
                  void annotations.clearPage(page).then(() => setAnswersVersion((v) => v + 1));
              }}
              className="chip"
            >
              Reiniciar página
            </button>
            <span
              role="status"
              aria-live="polite"
              className="flex min-h-11 shrink-0 items-center text-sm text-muted"
            >
              {syncStatus === "saved"
                ? "Guardado"
                : syncStatus === "saving"
                  ? "Guardando…"
                  : "Se guardará al reconectar"}
            </span>
          </div>
        )}
      </div>
      <div
        ref={scrollerRef}
        data-testid="page-scroller"
        className={
          "flex-1 overflow-auto p-2 " +
          (zoom > 1 ? "touch-pan-x touch-pan-y" : "touch-pan-y")
        }
        onDoubleClick={(e) => {
          if ((e.target as Element).closest(".reader-word")) return;
          setZoom(doubleTapZoom(zoom));
        }}
        onPointerDown={(e) => {
          if (e.pointerType !== "touch") {
            swipeStart.current = null;
            return;
          }
          pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
          if (pointers.current.size === 2) {
            const [a, b] = [...pointers.current.values()];
            pinch.current = { dist: distance(a, b), zoom };
            swipeStart.current = null;
          } else {
            swipeStart.current = { x: e.clientX, y: e.clientY };
          }
        }}
        onPointerMove={(e) => {
          if (!pointers.current.has(e.pointerId)) return;
          pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
          if (pinch.current && pointers.current.size === 2) {
            const [a, b] = [...pointers.current.values()];
            setZoom(
              pinchZoom(pinch.current.zoom, pinch.current.dist, distance(a, b)),
            );
          }
        }}
        onPointerCancel={(e) => {
          pointers.current.delete(e.pointerId);
          if (pointers.current.size < 2) pinch.current = null;
        }}
        onPointerUp={(e) => {
          const wasPinching = pinch.current !== null;
          pointers.current.delete(e.pointerId);
          if (pointers.current.size < 2) pinch.current = null;
          const s = swipeStart.current;
          swipeStart.current = null;
          if (wasPinching || !s) return;
          // Doble toque táctil en una zona sin palabra (RF-19 c2).
          const now = e.timeStamp;
          const moved = Math.hypot(e.clientX - s.x, e.clientY - s.y);
          if (moved < 10 && !(e.target as Element).closest(".reader-word")) {
            const prev = lastTap.current;
            if (
              prev &&
              now - prev.t < 300 &&
              Math.hypot(e.clientX - prev.x, e.clientY - prev.y) < 30
            ) {
              lastTap.current = null;
              setZoom(doubleTapZoom(zoom));
              return;
            }
            lastTap.current = { t: now, x: e.clientX, y: e.clientY };
          }
          if (!swipeChangesPage(zoom)) return; // con zoom, deslizar desplaza (RF-19 c1)
          if (writeMode || (e.target as Element).closest("[data-annotation]")) return; // escribir no cambia de página
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
          data-testid="page-surface"
          className={
            "relative mx-auto rounded-sm bg-white shadow-card " +
            (viewport ? "" : "w-full max-w-[900px]")
          }
          style={{
            aspectRatio: aspect,
            containerType: "inline-size",
            ...(viewport
              ? { width: baseWidth({ fit, viewport, aspect }) * zoom }
              : {}),
          }}
        >
          {!error && (
            // eslint-disable-next-line @next/next/no-img-element -- WebP estático con tamaño propio
            <img
              src={imageUrl(page)}
              alt={`Imagen de la página ${page}`}
              className="absolute inset-0 h-full w-full select-none"
              draggable={false}
            />
          )}
          {/* Zonas laterales antes de la capa de texto: quedan debajo y no tapan palabras. */}
          <button
            type="button"
            tabIndex={-1}
            aria-hidden="true"
            className={
              "absolute inset-y-0 left-0 w-[8%]" +
              (zoom > 1 ? " pointer-events-none" : "")
            }
            onClick={() => go("prev")}
          />
          <button
            type="button"
            tabIndex={-1}
            aria-hidden="true"
            className={
              "absolute inset-y-0 right-0 w-[8%]" +
              (zoom > 1 ? " pointer-events-none" : "")
            }
            onClick={() => go("next")}
          />
          {data && (
            <TextLayer
              page={data}
              active={active}
              highlight={highlight}
              plurals={plurals}
              seen={seenMarks}
              onWordClick={(token, rect) => setSelected({ page, token, rect })}
            />
          )}
          {annotations && (
            <AnnotationLayer
              sync={annotations}
              page={page}
              writeMode={writeMode}
              visible={!hideAnswers}
              version={answersVersion}
            />
          )}
          {error && (
            <div
              role="alert"
              className="absolute inset-x-4 top-4 card bg-surface p-3 text-sm"
            >
              {errorMessage ?? "No se pudo cargar la página."}{" "}
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
          key={`${page}-${open.token}`}
          page={data}
          tokenIndex={open.token}
          pageNumber={page}
          anchor={open.rect}
          seen={
            data.tokens[open.token]?.l !== undefined
              ? seenWords?.get(data.tokens[open.token].l as number)
              : undefined
          }
          firstBookTitle={(() => {
            const id = data.tokens[open.token]?.l;
            const bid = id === undefined ? null : seenWords?.get(id)?.bookId;
            return bid ? seenBookTitles?.[bid] : undefined;
          })()}
          onStatus={onSeenStatus}
          onRemove={onSeenRemove}
          searchLexicon={searchLexicon}
          onClose={() => setSelected(null)}
        />
      )}

      <nav
        aria-label="Páginas"
        className="flex items-center justify-center gap-2 border-t border-border bg-surface px-3 py-2"
        style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
      >
        <button
          type="button"
          aria-label="Página anterior"
          disabled={page <= 1}
          onClick={() => go("prev")}
          className="btn-round"
        >
          <Icon name="left" size={22} />
        </button>
        <span
          aria-live="polite"
          className="min-w-[5.5rem] text-center text-sm font-medium text-muted"
        >{`página ${page} de ${total}`}</span>
        <button
          type="button"
          aria-label="Página siguiente"
          disabled={page >= total}
          onClick={() => go("next")}
          className="btn-round"
        >
          <Icon name="right" size={22} />
        </button>
        <form onSubmit={onSubmit} className="ml-2 flex items-center gap-2">
          <label className="sr-only" htmlFor="reader-goto">
            Ir a la página
          </label>
          <input
            id="reader-goto"
            inputMode="numeric"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            aria-invalid={inputError}
            className="min-h-11 w-14 rounded-full border border-border bg-surface px-2 text-center focus:border-accent"
          />
          <button type="submit" className="btn-go">
            Ir
          </button>
        </form>
      </nav>
      {inputError && (
        <p role="alert" className="px-3 pb-2 text-sm text-danger">
          Escribe un número entre 1 y {total}.
        </p>
      )}
    </div>
  );
}
