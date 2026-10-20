"use client";

import { useEffect, useRef } from "react";

type Props = {
  /** Nombre accesible del diálogo. */
  label: string;
  onClose: () => void;
  /** Rectángulo junto al que se coloca la tarjeta desde 768 px; sin él, hoja inferior. */
  anchor: DOMRect | null;
  children: React.ReactNode;
};

const CLOSE_SWIPE_PX = 60;
const CARD_WIDTH = 384;

/** Hoja inferior en móvil y tarjeta junto al ancla desde 768 px (RF-21, RF-47). Esc cierra,
 * el foco entra al diálogo y vuelve al elemento anterior al cerrar. */
export function Sheet({ label, onClose, anchor, children }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const dragStart = useRef<number | null>(null);
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeRef.current();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      previous?.focus?.();
    };
  }, []);

  const wide =
    typeof window !== "undefined" &&
    window.matchMedia?.("(min-width: 768px)").matches;
  let cardStyle: React.CSSProperties | undefined;
  if (wide && anchor) {
    const left = Math.min(
      Math.max(anchor.left, 8),
      window.innerWidth - CARD_WIDTH - 8,
    );
    const below = anchor.bottom + 8 + 240 < window.innerHeight;
    cardStyle = below
      ? { left, top: anchor.bottom + 8, width: CARD_WIDTH }
      : {
          left,
          bottom: window.innerHeight - anchor.top + 8,
          width: CARD_WIDTH,
        };
  }

  return (
    <>
      <div
        className="fixed inset-0 z-40"
        aria-hidden="true"
        onPointerDown={onClose}
      />
      <div
        ref={ref}
        role="dialog"
        aria-label={label}
        tabIndex={-1}
        style={cardStyle}
        className={
          "fixed z-50 border border-border bg-surface p-4 shadow-xl outline-none " +
          (cardStyle
            ? "max-h-[70dvh] overflow-auto rounded-xl"
            : "inset-x-0 bottom-0 max-h-[70dvh] overflow-auto rounded-t-2xl pb-[max(1rem,env(safe-area-inset-bottom))]")
        }
      >
        <div
          data-testid="panel-handle"
          className="mx-auto mb-3 flex h-6 w-full touch-none justify-center md:hidden"
          onPointerDown={(e) => {
            dragStart.current = e.clientY;
          }}
          onPointerUp={(e) => {
            const start = dragStart.current;
            dragStart.current = null;
            if (start !== null && e.clientY - start >= CLOSE_SWIPE_PX)
              onClose();
          }}
        >
          <span className="mt-1 h-1.5 w-10 rounded-full bg-border" />
        </div>

        <button
          type="button"
          onClick={onClose}
          className="absolute right-2 top-2 min-h-11 min-w-11 rounded text-lg"
        >
          <span aria-hidden="true">×</span>
          <span className="sr-only">Cerrar</span>
        </button>

        {children}
      </div>
    </>
  );
}
