/** RF-44: preferencia de tema guardada en el dispositivo. «system» sigue al sistema operativo. */
export type ThemePref = "system" | "light" | "dark";

export const THEME_KEY = "my-deutsch:theme";

const ORDER: ThemePref[] = ["system", "light", "dark"];

export function parseTheme(raw: string | null | undefined): ThemePref {
  return raw === "light" || raw === "dark" ? raw : "system";
}

export function nextTheme(current: ThemePref): ThemePref {
  return ORDER[(ORDER.indexOf(current) + 1) % ORDER.length];
}

/** Tema que se ve de verdad: la preferencia, o el del sistema si es «Sistema». */
export function effectiveTheme(pref: ThemePref, systemDark: boolean): "light" | "dark" {
  return pref === "system" ? (systemDark ? "dark" : "light") : pref;
}

/** El botón de sol/luna alterna entre claro y oscuro (RF-44). */
export function oppositeTheme(current: "light" | "dark"): "light" | "dark" {
  return current === "dark" ? "light" : "dark";
}

export const THEME_LABEL: Record<ThemePref, string> = {
  system: "Sistema",
  light: "Claro",
  dark: "Oscuro",
};

/** Script que corre antes del primer pintado para evitar el destello de tema equivocado. */
export const THEME_INIT_SCRIPT = `try{var t=localStorage.getItem(${JSON.stringify(THEME_KEY)});if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`;
