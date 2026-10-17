const BASE = "http://local.invalid";
const CONTROL_OR_BACKSLASH = /[\u0000-\u001F\u007F\\]/;

/** Solo se acepta un destino del mismo origen; cualquier otra cosa vuelve a /grupos (evita redirecciones abiertas). */
export function safeNext(
  next: string | null | undefined,
  fallback = "/grupos",
): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return fallback;
  // Los navegadores ignoran tabuladores y saltos de línea: "/\t/malo.com" se leería como "//malo.com".
  if (CONTROL_OR_BACKSLASH.test(next)) return fallback;
  try {
    const url = new URL(next, BASE);
    if (url.origin !== BASE) return fallback;
    return url.pathname + url.search + url.hash;
  } catch {
    return fallback;
  }
}
