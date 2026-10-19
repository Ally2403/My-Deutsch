import { DEFAULT_PREFS, mergePrefs, parsePrefs, toLocalEntries, type Prefs } from "@/lib/domain/prefs";
import { createClient } from "@/lib/supabase/client";

/** Aplica las preferencias a este dispositivo (tema y lector) y avisa a los componentes que las leen. */
export function applyLocal(p: Prefs): void {
  try {
    for (const [k, v] of Object.entries(toLocalEntries(p))) {
      if (v === null) localStorage.removeItem(k);
      else localStorage.setItem(k, v);
    }
  } catch {
    /* sin almacenamiento: valen solo hasta recargar */
  }
  const root = document.documentElement;
  if (p.theme === "system") delete root.dataset.theme;
  else root.dataset.theme = p.theme;
  window.dispatchEvent(new Event("storage"));
}

const SYNCED = "my-deutsch:prefs-synced";

async function userId(): Promise<string | null> {
  const { data } = await createClient().auth.getSession();
  return data.session?.user.id ?? null;
}

async function remote(id: string): Promise<Prefs> {
  const { data } = await createClient().from("profiles").select("prefs").eq("id", id).maybeSingle();
  return data ? parsePrefs(data.prefs) : DEFAULT_PREFS;
}

/** Una vez por pestaña: trae las preferencias del perfil y las aplica a este dispositivo (RF-37 c1). */
export async function syncPrefsOnce(): Promise<void> {
  try {
    if (sessionStorage.getItem(SYNCED)) return;
    const id = await userId();
    if (!id) return;
    const { data } = await createClient().from("profiles").select("prefs").eq("id", id).maybeSingle();
    sessionStorage.setItem(SYNCED, "1");
    // Un perfil sin preferencias guardadas no pisa lo que la persona ya eligió en este dispositivo.
    const stored = data?.prefs;
    if (stored && typeof stored === "object" && Object.keys(stored).length > 0) {
      applyLocal(parsePrefs(stored));
    }
  } catch {
    /* sin red: se usan las preferencias locales */
  }
}

/** Guarda un cambio en el perfil (si hay sesión) sin interrumpir a quien lee. */
export async function savePrefs(patch: Partial<Prefs>): Promise<boolean> {
  try {
    const id = await userId();
    if (!id) return false;
    const next = mergePrefs(await remote(id), patch);
    const { error } = await createClient().from("profiles").update({ prefs: next }).eq("id", id);
    return !error;
  } catch {
    return false;
  }
}
