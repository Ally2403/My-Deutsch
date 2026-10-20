"use client";

import { useCallback, useEffect, useRef } from "react";
import { PAGE_READ_MS, addPageRead } from "@/lib/domain/progress";

export type ProgressSave = (progress: {
  lastPage: number;
  pagesRead: number[];
}) => Promise<void> | void;

const SAVE_DELAY_MS = 1000;

/**
 * RF-20 / RN-14: guarda la última página (con un pequeño retraso para no escribir en cada
 * toque) y marca como «leída» la página en la que se permanece PAGE_READ_MS. Los fallos
 * de red no interrumpen la lectura: el siguiente cambio de página vuelve a intentarlo.
 */
export function useReadingProgress({
  save,
  initialPagesRead,
  readMs = PAGE_READ_MS,
  saveDelayMs = SAVE_DELAY_MS,
  onReadChange,
}: {
  /** RF-49: avisa con la lista de páginas leídas cada vez que cambia. */
  onReadChange?: (pagesRead: number[]) => void;
  save: ProgressSave;
  initialPagesRead: number[];
  readMs?: number;
  saveDelayMs?: number;
}) {
  const state = useRef({ last: 0, read: initialPagesRead });
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const readTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dirty = useRef(false);
  const saveRef = useRef(save);
  const onReadRef = useRef(onReadChange);
  useEffect(() => {
    saveRef.current = save;
    onReadRef.current = onReadChange;
  }, [save, onReadChange]);

  const flush = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = null;
    if (!dirty.current) return;
    dirty.current = false;
    const { last, read } = state.current;
    try {
      void Promise.resolve(
        saveRef.current({ lastPage: last, pagesRead: read }),
      ).catch(() => {});
    } catch {
      /* se reintenta en el siguiente cambio */
    }
  }, []);

  const schedule = useCallback(() => {
    dirty.current = true;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(flush, saveDelayMs);
  }, [flush, saveDelayMs]);

  const onPageChange = useCallback(
    (page: number) => {
      state.current.last = page;
      schedule();
      if (readTimer.current) clearTimeout(readTimer.current);
      readTimer.current = setTimeout(() => {
        state.current.read = addPageRead(state.current.read, page);
        onReadRef.current?.(state.current.read);
        schedule();
      }, readMs);
    },
    [schedule, readMs],
  );

  useEffect(
    () => () => {
      if (readTimer.current) clearTimeout(readTimer.current);
      flush();
    },
    [flush],
  );

  return onPageChange;
}
