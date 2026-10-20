import type { ReviewStore } from "@/lib/domain/review-sync";
import { createClient } from "./client";

/** RF-48: guarda tarjeta (upsert) y reseña (idempotente por `id`) bajo RLS de la usuaria. */
export function supabaseReviewStore(userId: string): ReviewStore {
  const supabase = createClient();
  return {
    async save(p) {
      const { error: e1 } = await supabase
        .from("card_state")
        .upsert(
          { user_id: userId, lexicon_id: p.lexiconId, ...p.card },
          { onConflict: "user_id,lexicon_id" },
        );
      if (e1) throw e1;
      const { error: e2 } = await supabase
        .from("review_log")
        .upsert(
          { user_id: userId, lexicon_id: p.lexiconId, ...p.log },
          { onConflict: "id", ignoreDuplicates: true },
        );
      if (e2) throw e2;
    },
  };
}
