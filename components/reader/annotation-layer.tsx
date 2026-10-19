"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { AnnotationSync } from "@/lib/annotations/sync";
import { pointToRel, type Annotation } from "@/lib/domain/annotation";
import type { Box } from "@/lib/domain/page";

type Props = {
  sync: AnnotationSync;
  page: number;
  /** Modo «Escribir» (RF-33 c3): solo entonces la capa recibe toques. */
  writeMode: boolean;
  /** Interruptor «Mis respuestas» (RF-33 c4). */
  visible: boolean;
  /** Cambia cuando algo externo (reiniciar la página, RF-35) modifica lo guardado. */
  version?: number;
  /** Huecos de ejercicio detectados al procesar el libro (RF-34). */
  fields?: readonly Box[];
  /** Clave para recordar en el dispositivo qué campos se ocultaron (libro y página). */
  hiddenKey?: string;
};

const HIDDEN_PREFIX = "my-deutsch:hidden-fields:";

function readHidden(key?: string): number[] {
  if (!key) return [];
  try {
    const v: unknown = JSON.parse(
      localStorage.getItem(HIDDEN_PREFIX + key) ?? "[]",
    );
    return Array.isArray(v)
      ? v.filter((n): n is number => Number.isInteger(n))
      : [];
  } catch {
    return [];
  }
}

/** RF-33 / RN-13: respuestas escritas sobre la página, en coordenadas relativas 0–1. */
export function AnnotationLayer({
  sync,
  page,
  writeMode,
  visible,
  version = 0,
  fields = [],
  hiddenKey,
}: Props) {
  const [items, setItems] = useState<Annotation[]>([]);
  const layerRef = useRef<HTMLDivElement>(null);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [hidden, setHidden] = useState<number[]>([]);
  useEffect(() => setHidden(readHidden(hiddenKey)), [hiddenKey]); // eslint-disable-line react-hooks/set-state-in-effect
  const touched = useRef(false); // si la persona ya escribió, la carga tardía no pisa su cuadro

  useEffect(() => {
    let alive = true;
    touched.current = false;
    const apply = (list: Annotation[]) =>
      alive && !touched.current && setItems(list);
    void sync.get(page).then(apply);
    void sync.load(page).then(apply);
    return () => {
      alive = false;
      void sync.flush(); // cambiar de página antes de 1 s no pierde nada (RNF-14 c1)
    };
  }, [sync, page, version]);

  const save = useCallback(
    (a: Annotation) => {
      touched.current = true;
      setItems((list) => list.map((x) => (x.id === a.id ? a : x)));
      void sync.upsert(a);
    },
    [sync],
  );
  const drop = useCallback(
    (id: string) => {
      touched.current = true;
      setItems((list) => list.filter((x) => x.id !== id));
      void sync.remove(id, page);
    },
    [sync, page],
  );

  if (!visible) return null;

  return (
    <div
      ref={layerRef}
      data-testid="annotation-layer"
      className={
        "absolute inset-0 [container-type:inline-size] " +
        (writeMode ? "cursor-text" : "pointer-events-none")
      }
      onClick={(e) => {
        if (!writeMode || e.target !== e.currentTarget) return;
        const { x, y } = pointToRel(
          e.clientX,
          e.clientY,
          e.currentTarget.getBoundingClientRect(),
        );
        const a: Annotation = {
          id: crypto.randomUUID(),
          page,
          x,
          y,
          text: "",
          kind: "free",
        };
        touched.current = true;
        setItems((list) => [...list, a]);
        setFocusId(a.id);
      }}
    >
      {writeMode &&
        fields.map((f, i) => {
          // Un campo con respuesta ya no muestra su casilla; uno oculto tampoco.
          if (
            hidden.includes(i) ||
            items.some(
              (a) => a.kind === "field" && a.x === f[0] && a.y === f[1],
            )
          )
            return null;
          return (
            <div
              key={`field-${i}`}
              data-annotation
              className="absolute flex items-center"
              style={{
                left: `${f[0] * 100}%`,
                top: `${f[1] * 100}%`,
                width: `${f[2] * 100}%`,
                height: `${f[3] * 100}%`,
              }}
            >
              <button
                type="button"
                aria-label={`Campo de ejercicio ${i + 1}`}
                className="relative size-full rounded border border-dashed border-accent bg-accent/10 before:absolute before:inset-x-0 before:top-1/2 before:h-11 before:-translate-y-1/2 before:content-['']"
                onClick={() => {
                  const a: Annotation = {
                    id: crypto.randomUUID(),
                    page,
                    x: f[0],
                    y: f[1],
                    w: f[2],
                    text: "",
                    kind: "field",
                  };
                  touched.current = true;
                  setItems((list) => [...list, a]);
                  setFocusId(a.id);
                }}
              />
              <button
                type="button"
                aria-label="Ocultar campo"
                className="absolute -right-1 -top-4 flex size-11 items-center justify-center text-xs text-muted"
                onClick={() => {
                  const next = [...hidden, i];
                  setHidden(next);
                  if (hiddenKey) {
                    try {
                      localStorage.setItem(
                        HIDDEN_PREFIX + hiddenKey,
                        JSON.stringify(next),
                      );
                    } catch {
                      /* se oculta solo en esta visita */
                    }
                  }
                }}
              >
                ✕
              </button>
            </div>
          );
        })}
      {items.map((a) => (
        <div
          key={a.id}
          data-annotation
          className="absolute flex items-start"
          style={{
            left: `${a.x * 100}%`,
            top: `${a.y * 100}%`,
            maxWidth: `${Math.max(100 - a.x * 100, 10)}%`,
            ...(a.w ? { width: `${a.w * 100}%` } : {}),
          }}
        >
          <textarea
            aria-label="Respuesta"
            rows={1}
            readOnly={!writeMode}
            value={a.text}
            ref={(el) => {
              if (el && focusId === a.id) {
                el.focus();
                setFocusId(null);
              }
            }}
            onChange={(e) => save({ ...a, text: e.target.value })}
            onBlur={() => a.text.trim() === "" && drop(a.id)}
            style={
              {
                fontSize: "2.4cqw",
                fieldSizing: "content",
                ...(a.w ? { width: "100%" } : {}),
              } as React.CSSProperties
            }
            className={
              "min-w-[8ch] resize-none rounded border bg-surface/90 px-1 text-accent " +
              (writeMode
                ? "border-accent"
                : "border-transparent bg-transparent")
            }
          />
          {writeMode && (
            <div className={a.w ? "absolute left-full top-0 flex" : "flex"}>
              {!a.w && (
                <button
                  type="button"
                  aria-label="Mover respuesta"
                  className="flex size-11 touch-none items-center justify-center text-muted"
                  onPointerDown={(e) => {
                    e.currentTarget.setPointerCapture(e.pointerId);
                  }}
                  onPointerMove={(e) => {
                    if (
                      !e.currentTarget.hasPointerCapture(e.pointerId) ||
                      !layerRef.current
                    )
                      return;
                    const { x, y } = pointToRel(
                      e.clientX,
                      e.clientY,
                      layerRef.current.getBoundingClientRect(),
                    );
                    setItems((list) =>
                      list.map((i) => (i.id === a.id ? { ...i, x, y } : i)),
                    );
                  }}
                  onPointerUp={(e) => {
                    e.currentTarget.releasePointerCapture(e.pointerId);
                    const cur = items.find((i) => i.id === a.id);
                    if (cur) void sync.upsert(cur);
                  }}
                >
                  ✥
                </button>
              )}
              <button
                type="button"
                aria-label="Borrar respuesta"
                className="flex size-11 items-center justify-center text-muted"
                onClick={() => drop(a.id)}
              >
                ✕
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
