"use client";

import { useCallback, useSyncExternalStore } from "react";

const KEY = "my-deutsch:highlight";
const listeners = new Set<() => void>();
// Solo se usa si localStorage no está disponible (modo privado, datos bloqueados).
let fallback: boolean | null = null;

function read(): boolean {
  if (fallback !== null) return fallback;
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

function write(value: boolean) {
  try {
    localStorage.setItem(KEY, value ? "1" : "0");
    fallback = null;
  } catch {
    fallback = value;
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

/** Preferencia «colorear sustantivos», recordada entre páginas, libros y sesiones (RF-26 c3). */
export function useHighlightPref(): [boolean, (value: boolean) => void] {
  const value = useSyncExternalStore(subscribe, read, () => false);
  const set = useCallback((v: boolean) => write(v), []);
  return [value, set];
}
