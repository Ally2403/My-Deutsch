"use client";

import { useSyncExternalStore } from "react";
import {
  THEME_KEY,
  effectiveTheme,
  oppositeTheme,
  parseTheme,
  type ThemePref,
} from "@/lib/domain/theme";

const DARK_QUERY = "(prefers-color-scheme: dark)";

const systemQuery = () =>
  typeof window.matchMedia === "function" ? window.matchMedia(DARK_QUERY) : null;

/** Tema que se ve ahora: la preferencia guardada o, sin ella, la del sistema. */
function read(): "light" | "dark" {
  let pref: ThemePref = "system";
  try {
    pref = parseTheme(localStorage.getItem(THEME_KEY));
  } catch {
    /* sin almacenamiento: se sigue al sistema */
  }
  return effectiveTheme(pref, (systemQuery()?.matches ?? false));
}

const listeners = new Set<() => void>();
function subscribe(cb: () => void) {
  listeners.add(cb);
  const mq = systemQuery();
  mq?.addEventListener("change", cb);
  window.addEventListener("storage", cb);
  return () => {
    listeners.delete(cb);
    mq?.removeEventListener("change", cb);
    window.removeEventListener("storage", cb);
  };
}

function apply(theme: "light" | "dark") {
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    /* el tema vale solo para esta visita */
  }
  listeners.forEach((l) => l());
}

/** Botón de sol/luna: muestra el tema al que se cambiará (RF-44). */
export function ThemeToggle({ className = "" }: { className?: string }) {
  const current = useSyncExternalStore(subscribe, read, () => "light" as const);
  const next = oppositeTheme(current);
  return (
    <button
      type="button"
      onClick={() => apply(next)}
      aria-label={next === "dark" ? "Cambiar a modo oscuro" : "Cambiar a modo claro"}
      title={next === "dark" ? "Modo oscuro" : "Modo claro"}
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
        {next === "dark" ? (
          <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" />
        ) : (
          <>
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
          </>
        )}
      </svg>
    </button>
  );
}
