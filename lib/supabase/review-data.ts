import type { SupabaseClient } from "@supabase/supabase-js";
import type { CardRow } from "@/lib/domain/review";
import type { Database } from "./database.types";

const PAGE = 1000;
/** Margen para cubrir el «día» (04:00) en cualquier zona horaria del dispositivo. */
const LOG_WINDOW_MS = 36 * 3_600_000;

export type RecentLog = { reviewedAt: string; stateBefore: number };

/** RN-04: RLS solo devuelve las tarjetas propias. */
export async function loadCards(
  supabase: SupabaseClient<Database>,
  me: string,
): Promise<Record<number, CardRow & { lexicon_id: number }>> {
  const out: Record<number, CardRow & { lexicon_id: number }> = {};
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("card_state")
      .select(
        "lexicon_id, due, stability, difficulty, elapsed_days, scheduled_days, reps, lapses, state, last_review",
      )
      .eq("user_id", me)
      .order("lexicon_id")
      .range(from, from + PAGE - 1);
    if (error) throw new Error("No se pudieron cargar las tarjetas");
    for (const r of data ?? []) out[r.lexicon_id] = r;
    if ((data?.length ?? 0) < PAGE) break;
  }
  return out;
}

export async function loadRecentLogs(
  supabase: SupabaseClient<Database>,
  me: string,
): Promise<RecentLog[]> {
  const since = new Date(Date.now() - LOG_WINDOW_MS).toISOString();
  const { data, error } = await supabase
    .from("review_log")
    .select("reviewed_at, state_before")
    .eq("user_id", me)
    .gte("reviewed_at", since)
    .limit(PAGE);
  if (error) throw new Error("No se pudo cargar el historial de repaso");
  return (data ?? []).map((r) => ({
    reviewedAt: r.reviewed_at,
    stateBefore: r.state_before,
  }));
}

/** Ids y estado de las palabras propias (payload mínimo para «Repaso de hoy»). */
export async function loadWordFlags(
  supabase: SupabaseClient<Database>,
  me: string,
): Promise<{ id: number; known: boolean }[]> {
  const out: { id: number; known: boolean }[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("user_words")
      .select("lexicon_id, status")
      .eq("user_id", me)
      .order("lexicon_id")
      .range(from, from + PAGE - 1);
    if (error) throw new Error("No se pudo cargar el diccionario");
    for (const r of data ?? [])
      out.push({ id: r.lexicon_id, known: r.status === "known" });
    if ((data?.length ?? 0) < PAGE) break;
  }
  return out;
}

/** Vencimientos de las tarjetas propias (usa el índice `(user_id, due)`). */
export async function loadCardDues(
  supabase: SupabaseClient<Database>,
  me: string,
): Promise<{ id: number; due: string }[]> {
  const out: { id: number; due: string }[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("card_state")
      .select("lexicon_id, due")
      .eq("user_id", me)
      .order("lexicon_id")
      .range(from, from + PAGE - 1);
    if (error) throw new Error("No se pudieron cargar las tarjetas");
    for (const r of data ?? []) out.push({ id: r.lexicon_id, due: r.due });
    if ((data?.length ?? 0) < PAGE) break;
  }
  return out;
}
