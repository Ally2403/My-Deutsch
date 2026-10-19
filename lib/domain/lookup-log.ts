export type Lookup = {
  lexiconId: number;
  lemma: string;
  pos: string;
  page: number;
  sentence: string;
  /** Libro donde se consultó; lo agrega el lector al encolar (RN-05). */
  bookId?: string;
};

type Handler = (lookup: Lookup) => void;

let handler: Handler | null = null;

/** Conecta el registro de consultas (RN-05); la conexión a `user_words` está en `useLookupSync` (RF-27). */
export function setLookupHandler(fn: Handler | null): void {
  handler = fn;
}

/** Registra la consulta de una palabra; un fallo del manejador nunca interrumpe la lectura. */
export function recordLookup(lookup: Lookup): void {
  try {
    handler?.(lookup);
  } catch {
    // El registro es secundario: no debe romper el panel.
  }
}
