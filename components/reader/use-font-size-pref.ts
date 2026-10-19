"use client";

import { useCallback, useSyncExternalStore } from "react";
import { DEFAULT_PREFS, FONT_SIZES, FONT_SIZE_KEY, parseFontSize, type FontSize } from "@/lib/domain/prefs";
import { savePrefs } from "@/lib/prefs/client";


function read(): FontSize {
  try {
    return parseFontSize(localStorage.getItem(FONT_SIZE_KEY));
  } catch {
    return DEFAULT_PREFS.fontSize;
  }
}
const subscribe = (cb: () => void) => {
  window.addEventListener("storage", cb);
  return () => window.removeEventListener("storage", cb);
};

/** Tamaño de letra del modo lectura (RF-37): se recuerda en el dispositivo y en el perfil. */
export function useFontSizePref(): [FontSize, (delta: 1 | -1) => void] {
  const size = useSyncExternalStore(subscribe, read, () => DEFAULT_PREFS.fontSize);
  const step = useCallback((delta: 1 | -1) => {
    const i = FONT_SIZES.indexOf(read()) + delta;
    const next = FONT_SIZES[Math.min(Math.max(i, 0), FONT_SIZES.length - 1)];
    try {
      localStorage.setItem(FONT_SIZE_KEY, next);
    } catch {
      /* solo vale para esta visita */
    }
    window.dispatchEvent(new Event("storage"));
    void savePrefs({ fontSize: next });
  }, []);
  return [size, step];
}
