/** RF-11 / RNF-11: validación de título y archivo antes de subir, y mensajes de error de la API. */

export const MAX_UPLOAD_BYTES = 52_428_800;
export const MAX_TITLE_LENGTH = 200;

export function validateTitle(
  raw: string,
): { ok: true; title: string } | { ok: false; message: string } {
  const title = raw.trim();
  if (title.length === 0)
    return { ok: false, message: "Escribe un título para el libro" };
  if (title.length > MAX_TITLE_LENGTH)
    return {
      ok: false,
      message: `El título no puede superar ${MAX_TITLE_LENGTH} caracteres`,
    };
  return { ok: true, title };
}

const PDF_MAGIC = [0x25, 0x50, 0x44, 0x46]; // %PDF

export function validatePdfFile(file: {
  size: number;
  head: Uint8Array;
}): { ok: true } | { ok: false; message: string } {
  if (file.size <= 0) return { ok: false, message: "El archivo está vacío" };
  if (file.size > MAX_UPLOAD_BYTES)
    return {
      ok: false,
      message:
        "El PDF supera el límite de 50 MB. Comprímelo y vuelve a intentarlo",
    };
  const isPdf = PDF_MAGIC.every((byte, i) => file.head[i] === byte);
  if (!isPdf) return { ok: false, message: "El archivo no es un PDF" };
  return { ok: true };
}

const API_MESSAGES: Record<string, string> = {
  upload_missing: "No se encontró el archivo subido. Vuelve a subirlo",
  not_pdf: "El archivo no es un PDF",
  too_large:
    "El PDF supera el límite de 50 MB. Comprímelo y vuelve a intentarlo",
  forbidden: "No tienes permiso para hacer esto",
  busy: "Espera a que termine tu libro actual",
  dispatch_failed:
    "El libro quedó registrado pero no pudo iniciar el procesamiento. Usa «Reintentar» en la biblioteca",
  not_retryable: "Aún no se puede reintentar. Espera unos minutos e inténtalo de nuevo",
  not_pending: "Esta solicitud ya fue procesada",
  not_authenticated: "Inicia sesión para continuar",
  not_found: "No encontramos ese libro",
  invalid_request:
    "La solicitud no es válida. Recarga la página e inténtalo de nuevo",
  unexpected: "Ocurrió un error inesperado. Inténtalo de nuevo",
};

const UNKNOWN_API_MESSAGE = "No se pudo completar. Inténtalo de nuevo";

export function apiErrorMessage(code: string): string {
  return Object.hasOwn(API_MESSAGES, code)
    ? API_MESSAGES[code]
    : UNKNOWN_API_MESSAGE;
}

/** 502 al reintentar: la solicitud ya quedó registrada (libro en cola) y solo falló el disparo. */
export const RETRY_DISPATCH_FAILED_MESSAGE =
  "El reintento quedó registrado pero no pudo iniciarse. Si sigue «En cola», podrás reintentar de nuevo en unos minutos";
