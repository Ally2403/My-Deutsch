// RF-50 c5: lógica pura para decidir qué mostrar en «Instalar en tu celular».

export type InstallEnv = {
  userAgent: string;
  maxTouchPoints: number;
  /** `display-mode: standalone` o `navigator.standalone` (iOS). */
  standalone: boolean;
  /** Se recibió `beforeinstallprompt` (Android/Chrome/Edge). */
  hasPrompt: boolean;
};

export type InstallMode = "installed" | "prompt" | "ios-steps" | "none";

/** iPhone/iPad; los iPad recientes se presentan como Mac con pantalla táctil. */
export function isIos(userAgent: string, maxTouchPoints: number): boolean {
  if (/iPhone|iPad|iPod/.test(userAgent)) return true;
  return /Macintosh/.test(userAgent) && maxTouchPoints > 1;
}

/** Ya instalada → se oculta; con evento → botón; iPhone → pasos manuales; si no, nada. */
export function installMode(env: InstallEnv): InstallMode {
  if (env.standalone) return "installed";
  if (env.hasPrompt) return "prompt";
  if (isIos(env.userAgent, env.maxTouchPoints)) return "ios-steps";
  return "none";
}
