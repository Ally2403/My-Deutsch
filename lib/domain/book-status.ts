/** RF-13: etiquetas de estado de un libro y reglas de reintento. */

export type BookStatusInput = {
  bookStatus: string;
  jobStatus: string | null;
  pagesDone: number;
  pageCount: number | null;
  error: string | null;
};

type Described = {
  label: string;
  tone: "pending" | "working" | "ready" | "error";
  progress: number | null;
};

function ratio(done: number, total: number | null): number | null {
  if (total === null || total <= 0) return null;
  return Math.min(1, Math.max(0, done / total));
}

/** El estado del libro manda; el del trabajo solo decide si el libro no tiene un estado conocido. */
export function describeStatus(i: BookStatusInput): Described {
  switch (i.bookStatus) {
    case "ready":
      return {
        label: "Listo",
        tone: "ready",
        progress: i.pageCount !== null && i.pageCount > 0 ? 1 : null,
      };
    case "error":
      return { label: "Error", tone: "error", progress: null };
    case "processing": {
      const progress = ratio(i.pagesDone, i.pageCount);
      const label =
        i.pageCount !== null && i.pageCount > 0
          ? `Procesando ${i.pagesDone}/${i.pageCount} páginas`
          : `Procesando ${i.pagesDone} páginas…`;
      return { label, tone: "working", progress };
    }
    case "queued":
      return { label: "En cola", tone: "pending", progress: null };
  }
  // Estado de libro desconocido: se usa el del trabajo, ignorando el valor 'superseded'.
  if (i.jobStatus === "error" && i.error !== "superseded")
    return { label: "Error", tone: "error", progress: null };
  return { label: "En cola", tone: "pending", progress: null };
}

/** Igual que request_retry (SQL): un libro en cola sin empezar tras 5 min perdió su disparo. */
export const STALE_QUEUE_MS = 5 * 60 * 1000;

export function isOwnerOrAdmin(i: {
  uploadedBy: string | null;
  userId: string;
  isAdmin: boolean;
}): boolean {
  return i.isAdmin || (i.uploadedBy !== null && i.uploadedBy === i.userId);
}

export function canRetry(i: {
  status: string;
  uploadedBy: string | null;
  userId: string;
  isAdmin: boolean;
  jobCreatedAt?: string | null;
  jobStartedAt?: string | null;
  now?: Date;
}): boolean {
  if (!isOwnerOrAdmin(i)) return false;
  if (i.status === "error") return true;
  if (i.status !== "queued") return false;
  if (!i.jobCreatedAt || i.jobStartedAt) return false;
  const created = Date.parse(i.jobCreatedAt);
  if (Number.isNaN(created)) return false;
  return (i.now ?? new Date()).getTime() - created > STALE_QUEUE_MS;
}

const GENERIC_ERROR = "No se pudo procesar el libro. Inténtalo de nuevo";

/** Códigos de worker/publish/job.py (JobError.code) y 'superseded' de la base. */
const ERROR_SUMMARIES: Record<string, string> = {
  invalid_pdf: "El PDF no se pudo leer o está dañado",
  empty_book: "El PDF no tiene páginas",
  too_many_pages: "El libro tiene demasiadas páginas",
  invalid_book_id: "La solicitud del libro no es válida",
  hash_mismatch: "El archivo cambió durante la subida. Vuelve a subirlo",
  publish_failed: "No se pudo guardar el libro procesado",
  processing_failed: "Falló el procesamiento del libro",
  superseded: "Se reemplazó por un nuevo intento",
};

export function summarizeError(raw: string | null): string {
  if (raw !== null && Object.hasOwn(ERROR_SUMMARIES, raw))
    return ERROR_SUMMARIES[raw];
  return GENERIC_ERROR;
}
