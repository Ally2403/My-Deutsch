"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { AnnotationSync } from "@/lib/annotations/sync";
import { pointToRel, type Annotation } from "@/lib/domain/annotation";

type Props = {
  sync: AnnotationSync;
  page: number;
  /** Modo «Escribir» (RF-33 c3): solo entonces la capa recibe toques. */
  writeMode: boolean;
  /** Interruptor «Mis respuestas» (RF-33 c4). */
  visible: boolean;
  /** Cambia cuando algo externo (reiniciar la página, RF-35) modifica lo guardado. */
  version?: number;
};

/** RF-33 / RN-13: respuestas escritas sobre la página, en coordenadas relativas 0–1. */
export function AnnotationLayer({ sync, page, writeMode, visible, version = 0 }: Props) {
  const [items, setItems] = useState<Annotation[]>([]);
  const layerRef = useRef<HTMLDivElement>(null);
  const [focusId, setFocusId] = useState<string | null>(null);
  const touched = useRef(false); // si la persona ya escribió, la carga tardía no pisa su cuadro

  useEffect(() => {
    let alive = true;
    touched.current = false;
    const apply = (list: Annotation[]) => alive && !touched.current && setItems(list);
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
        const a: Annotation = { id: crypto.randomUUID(), page, x, y, text: "", kind: "free" };
        touched.current = true;
        setItems((list) => [...list, a]);
        setFocusId(a.id);
      }}
    >
      {items.map((a) => (
        <div
          key={a.id}
          data-annotation
          className="absolute flex items-start"
          style={{
            left: `${a.x * 100}%`,
            top: `${a.y * 100}%`,
            maxWidth: `${Math.max(100 - a.x * 100, 10)}%`,
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
            style={{ fontSize: "2.4cqw", fieldSizing: "content" } as React.CSSProperties}
            className={
              "min-w-[8ch] resize-none rounded border bg-surface/90 px-1 text-accent " +
              (writeMode ? "border-accent" : "border-transparent bg-transparent")
            }
          />
          {writeMode && (
            <>
              <button
                type="button"
                aria-label="Mover respuesta"
                className="flex size-11 touch-none items-center justify-center text-muted"
                onPointerDown={(e) => {
                  e.currentTarget.setPointerCapture(e.pointerId);
                }}
                onPointerMove={(e) => {
                  if (!e.currentTarget.hasPointerCapture(e.pointerId) || !layerRef.current) return;
                  const { x, y } = pointToRel(
                    e.clientX,
                    e.clientY,
                    layerRef.current.getBoundingClientRect(),
                  );
                  setItems((list) => list.map((i) => (i.id === a.id ? { ...i, x, y } : i)));
                }}
                onPointerUp={(e) => {
                  e.currentTarget.releasePointerCapture(e.pointerId);
                  const cur = items.find((i) => i.id === a.id);
                  if (cur) void sync.upsert(cur);
                }}
              >
                ✥
              </button>
              <button
                type="button"
                aria-label="Borrar respuesta"
                className="flex size-11 items-center justify-center text-muted"
                onClick={() => drop(a.id)}
              >
                ✕
              </button>
            </>
          )}
        </div>
      ))}
    </div>
  );
}
