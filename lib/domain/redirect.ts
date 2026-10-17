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
    const out = url.pathname + url.search + url.hash;
    // La normalización puede producir "//host" (p. ej. "/a/..//malo.com"): se valida también la salida.
    if (!out.startsWith("/") || out.startsWith("//") || CONTROL_OR_BACKSLASH.test(out)) {
      return fallback;
    }
    return out;
  } catch {
    return fallback;
  }
}
