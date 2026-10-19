"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Preferencia booleana del lector recordada en `localStorage` (RF-26 c3, RF-41 c5).
 * Si el almacenamiento no está disponible (modo privado, datos bloqueados), la preferencia
 * sigue funcionando durante la sesión.
 */
function createBooleanPref(key: string) {
  const listeners = new Set<() => void>();
  let fallback: boolean | null = null;

  function read(): boolean {
    if (fallback !== null) return fallback;
    try {
      return localStorage.getItem(key) === "1";
    } catch {
      return false;
    }
  }

  function write(value: boolean) {
    try {
      localStorage.setItem(key, value ? "1" : "0");
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

  return function usePref(): [boolean, (value: boolean) => void] {
    const value = useSyncExternalStore(subscribe, read, () => false);
    const set = useCallback((v: boolean) => write(v), []);
    return [value, set];
  };
}

/** «Colorear sustantivos» según su género (RF-26). */
export const useHighlightPref = createBooleanPref("my-deutsch:highlight");
/** «Marcar plurales» en amarillo (RF-41). */
export const usePluralPref = createBooleanPref("my-deutsch:plurals");

/** Ocultar las marcas de palabras ya vistas (RF-28: «se puede ocultar»). */
export const useHideSeenPref = createBooleanPref("my-deutsch:hide-seen");

/** Ocultar mis respuestas escritas sobre la página (RF-33 c4). */
export const useHideAnswersPref = createBooleanPref("my-deutsch:hide-answers");

/** Modo lectura: texto ajustado al ancho en lugar de la imagen de la página (RF-18). */
export const useReadingModePref = createBooleanPref("my-deutsch:reading-mode");
