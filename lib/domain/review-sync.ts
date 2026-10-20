import { createLookupQueue, type QueueStorage } from "./lookup-queue";
import {
  cardToRow,
  type CardRow,
  type CardState,
  type ReviewLogInput,
} from "./review";

/** RF-48 c5: guardado fiable de reseñas (idempotente por `id`, cola sin conexión). */

export type ReviewPayload = {
  lexiconId: number;
  card: CardRow;
  log: {
    id: string;
    rating: number;
    reviewed_at: string;
    state_before: number;
  };
};

export type ReviewStore = {
  /** Upsert de `card_state` e inserción de `review_log` con «on conflict (id) do nothing». */
  save(payload: ReviewPayload): Promise<void>;
};

export function toPayload(r: {
  lexiconId: number;
  card: CardState;
  log: ReviewLogInput;
}): ReviewPayload {
  return {
    lexiconId: r.lexiconId,
    card: cardToRow(r.card),
    log: {
      id: r.log.id,
      rating: r.log.rating,
      reviewed_at: r.log.reviewedAt.toISOString(),
      state_before: r.log.stateBefore,
    },
  };
}

export function createReviewSync({
  store,
  storage,
  key,
}: {
  store: ReviewStore;
  storage: QueueStorage;
  key: string;
}) {
  const queue = createLookupQueue<ReviewPayload>({
    send: (p) => store.save(p),
    storage,
    key,
  });
  return {
    size: () => queue.size(),
    flush: () => queue.flush(),
    /** Encola y envía; si falla la red la reseña queda guardada para el siguiente intento. */
    async submit(result: {
      lexiconId: number;
      card: CardState;
      log: ReviewLogInput;
    }): Promise<void> {
      queue.enqueue(toPayload(result));
      await queue.flush();
    },
  };
}
