export type Lookup = {
  lexiconId: number;
  lemma: string;
  pos: string;
  page: number;
  sentence: string;
};

type Handler = (lookup: Lookup) => void;

let handler: Handler | null = null;

/** Conecta el registro de consultas (RN-05); la conexión a `user_words` llega con el diccionario personal. */
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
