// RF-47: traducción del trozo exacto que la usuaria seleccionó. Las oraciones completas ya vienen
// traducidas en el JSON de la página (sin red, RNF-01); un trozo se traduce al momento con un
// servicio gratuito (MyMemory), llamado desde el navegador para que el límite diario sea por
// persona y no compartido. Solo sale el trozo seleccionado, nunca la página ni la cuenta.

const ENDPOINT = "https://api.mymemory.translated.net/get";
/** MyMemory admite 500 bytes por consulta; se deja margen para las vocales con tilde. */
export const MAX_FRAGMENT_CHARS = 350;

export type FragmentResult =
  | { ok: true; es: string }
  | { ok: false; reason: "too_long" | "quota" | "network" | "empty" };

const cache = new Map<string, string>();

const ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&apos;": "'",
};

function decode(text: string): string {
  return text.replace(
    /&(?:amp|lt|gt|quot|apos|#39);/g,
    (m) => ENTITIES[m] ?? m,
  );
}

export async function translateFragment(
  text: string,
  opts: { signal?: AbortSignal; fetchImpl?: typeof fetch } = {},
): Promise<FragmentResult> {
  const q = text.replace(/\s+/g, " ").trim();
  if (q === "") return { ok: false, reason: "empty" };
  if (q.length > MAX_FRAGMENT_CHARS) return { ok: false, reason: "too_long" };
  const hit = cache.get(q);
  if (hit) return { ok: true, es: hit };
  const doFetch = opts.fetchImpl ?? fetch;
  let body: unknown;
  try {
    const res = await doFetch(
      `${ENDPOINT}?q=${encodeURIComponent(q)}&langpair=de%7Ces`,
      { signal: opts.signal },
    );
    if (res.status === 429) return { ok: false, reason: "quota" };
    if (!res.ok) return { ok: false, reason: "network" };
    body = await res.json();
  } catch {
    return { ok: false, reason: "network" };
  }
  const data = body as {
    responseStatus?: unknown;
    responseData?: { translatedText?: unknown };
  };
  const raw = data?.responseData?.translatedText;
  const status = Number(data?.responseStatus);
  if (typeof raw !== "string" || raw.trim() === "") {
    return { ok: false, reason: status === 429 ? "quota" : "network" };
  }
  // MyMemory devuelve el aviso de límite diario como si fuera la traducción.
  if (status === 429 || /MYMEMORY WARNING/i.test(raw)) {
    return { ok: false, reason: "quota" };
  }
  const es = decode(raw).trim();
  cache.set(q, es);
  return { ok: true, es };
}

/** Solo para las pruebas. */
export function clearFragmentCache() {
  cache.clear();
}
