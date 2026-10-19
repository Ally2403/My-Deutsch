"use client";

import { useSyncExternalStore } from "react";
import {
  THEME_KEY,
  THEME_LABEL,
  nextTheme,
  parseTheme,
  type ThemePref,
} from "@/lib/domain/theme";

/** RF-44: lee la preferencia guardada; en el servidor es «system». */
function read(): ThemePref {
  try {
    return parseTheme(localStorage.getItem(THEME_KEY));
  } catch {
    return "system";
  }
}

const listeners = new Set<() => void>();
function subscribe(cb: () => void) {
  listeners.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
}

function apply(pref: ThemePref) {
  const root = document.documentElement;
  if (pref === "system") delete root.dataset.theme;
  else root.dataset.theme = pref;
  try {
    if (pref === "system") localStorage.removeItem(THEME_KEY);
    else localStorage.setItem(THEME_KEY, pref);
  } catch {
    /* sin almacenamiento: el tema vale solo para esta visita */
  }
  listeners.forEach((l) => l());
}

const ICON: Record<ThemePref, React.ReactNode> = {
  system: (
    <>
      <rect x="3" y="4" width="18" height="12" rx="2" />
      <path d="M8 20h8M12 16v4" />
    </>
  ),
  light: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </>
  ),
  dark: <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" />,
};

/** Selector de tema (Sistema · Claro · Oscuro), un solo botón de 44 px. */
export function ThemeToggle({ className = "" }: { className?: string }) {
  const pref = useSyncExternalStore(subscribe, read, () => "system" as ThemePref);
  const next = nextTheme(pref);
  return (
    <button
      type="button"
      onClick={() => apply(next)}
      aria-label={`Tema: ${THEME_LABEL[pref]}. Cambiar a ${THEME_LABEL[next]}`}
      title={`Tema: ${THEME_LABEL[pref]}`}
      className={`pressable inline-flex size-11 items-center justify-center rounded-full text-muted hover:text-foreground ${className}`}
    >
      <svg
        viewBox="0 0 24 24"
        width="22"
        height="22"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        {ICON[pref]}
      </svg>
    </button>
  );
}
