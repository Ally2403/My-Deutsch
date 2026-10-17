/** Solo se acepta un destino interno; cualquier otra cosa vuelve a /grupos (evita redirecciones abiertas). */
export function safeNext(
  next: string | null | undefined,
  fallback = "/grupos",
): string {
  if (
    !next ||
    !next.startsWith("/") ||
    next.startsWith("//") ||
    next.includes("\\")
  ) {
    return fallback;
  }
  return next;
}
