"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { OutlineButton } from "@/components/ui";
import {
  canRetry as canRetryNow,
  describeStatus,
  resolvePageCount,
  summarizeError,
  type BookStatusInput,
} from "@/lib/domain/book-status";
import {
  RETRY_DISPATCH_FAILED_MESSAGE,
  apiErrorMessage,
  looksLikeSessionLoss,
} from "@/lib/domain/upload";
import { createClient } from "@/lib/supabase/client";

/**
 * RF-13: estado del libro con sondeo cada 10 s (≤ 30 s de retraso) mientras
 * esté en cola o procesando, y «Reintentar» para quien subió o administra.
 */

const POLL_MS = 10_000;

const isActive = (s: BookStatusInput) =>
  s.bookStatus === "queued" || s.bookStatus === "processing";

const toneClass: Record<string, string> = {
  pending: "text-muted",
  working: "text-foreground",
  ready: "text-foreground",
  error: "text-red-700 dark:text-red-400",
};

export function BookStatus({
  bookId,
  initial,
  canRetry,
  ownerOrAdmin,
  jobCreatedAt = null,
  jobStartedAt = null,
}: {
  bookId: string;
  initial: BookStatusInput;
  /** Compatibilidad: decisión ya combinada del servidor; se usa si no llega ownerOrAdmin. */
  canRetry: boolean;
  /** Permiso por rol (dueño o administrador), decidido en el servidor. */
  ownerOrAdmin?: boolean;
  jobCreatedAt?: string | null;
  jobStartedAt?: string | null;
}) {
  const { refresh } = useRouter();
  const [state, setState] = useState<BookStatusInput>(initial);
  const [retryError, setRetryError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);
  const [job, setJob] = useState({
    createdAt: jobCreatedAt,
    startedAt: jobStartedAt,
  });
  const [now, setNow] = useState(() => new Date());
  const latest = useRef(state);
  const inFlight = useRef(false);
  const mounted = useRef(true);
  const seq = useRef(0);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const active = isActive(state);

  useEffect(() => {
    if (!active) return;
    const supabase = createClient();
    let stopped = false;
    const id = setInterval(async () => {
      const mine = ++seq.current;
      setNow(new Date());
      try {
        const [bookRes, jobRes] = await Promise.all([
          supabase
            .from("books")
            .select("status, page_count")
            .eq("id", bookId)
            .maybeSingle(),
          supabase
            .from("jobs")
            .select("status, pages_done, pages_total, error, created_at, started_at")
            .eq("book_id", bookId)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle(),
        ]);
        if (stopped || !mounted.current || mine !== seq.current) return;
        const book = bookRes.error ? null : bookRes.data;
        if (!book) return;
        const job = jobRes.error ? null : jobRes.data;
        const prev = latest.current;
        const next: BookStatusInput = {
          bookStatus: book.status,
          pageCount: resolvePageCount(book.page_count, job?.pages_total),
          jobStatus: job ? job.status : prev.jobStatus,
          pagesDone: job ? job.pages_done : prev.pagesDone,
          error: job ? job.error : prev.error,
        };
        const changed =
          next.bookStatus !== prev.bookStatus ||
          next.pagesDone !== prev.pagesDone;
        latest.current = next;
        setState(next);
        if (job) setJob({ createdAt: job.created_at, startedAt: job.started_at });
        if (changed) refresh();
      } catch {
        // Se conserva el último estado; el siguiente ciclo reintenta.
      }
    }, POLL_MS);
    return () => {
      stopped = true;
      clearInterval(id);
    };
  }, [active, bookId, refresh]);

  async function retry() {
    if (inFlight.current) return;
    inFlight.current = true;
    setRetrying(true);
    setRetryError(null);
    try {
      const res = await fetch(`/api/libros/${bookId}/reintentar`, {
        method: "POST",
      });
      if (looksLikeSessionLoss(res)) {
        // Redirección a /login o HTML: la sesión caducó; nunca se toma como «En cola».
        if (mounted.current) setRetryError(apiErrorMessage("not_authenticated"));
        return;
      }
      let code = "unexpected";
      if (!res.ok) {
        try {
          const body = (await res.json()) as { error?: unknown };
          if (typeof body.error === "string") code = body.error;
        } catch {
          // Cuerpo no JSON: se usa el mensaje genérico.
        }
      }
      if (!mounted.current) return;
      // 502: request_retry ya confirmó; solo falló el disparo. Libro en cola con job nuevo.
      const accepted = res.ok || (res.status === 502 && code === "dispatch_failed");
      if (accepted) {
        const next: BookStatusInput = {
          ...latest.current,
          bookStatus: "queued",
          jobStatus: "queued",
          pagesDone: 0,
          error: null,
        };
        latest.current = next;
        setState(next);
        setJob({ createdAt: new Date().toISOString(), startedAt: null });
        setNow(new Date());
        refresh();
        if (!res.ok) setRetryError(RETRY_DISPATCH_FAILED_MESSAGE);
      } else {
        setRetryError(apiErrorMessage(code));
      }
    } catch {
      if (mounted.current) setRetryError(apiErrorMessage("unexpected"));
    } finally {
      inFlight.current = false;
      if (mounted.current) setRetrying(false);
    }
  }

  const d = describeStatus(state);
  const showRetry = canRetryNow({
    status: state.bookStatus,
    uploadedBy: null,
    userId: "",
    isAdmin: ownerOrAdmin ?? canRetry,
    jobCreatedAt: job.createdAt,
    jobStartedAt: job.startedAt,
    now,
  });

  return (
    <div className="flex flex-col gap-2">
      <div aria-live="polite" className={`text-sm ${toneClass[d.tone]}`}>
        {d.label}
      </div>
      {d.progress !== null && (
        <div
          role="progressbar"
          aria-label="Progreso del libro"
          aria-valuenow={Math.round(d.progress * 100)}
          aria-valuemin={0}
          aria-valuemax={100}
          className="h-2 w-full overflow-hidden rounded-full bg-border"
        >
          <div
            className="h-full bg-accent"
            style={{ width: `${Math.round(d.progress * 100)}%` }}
          />
        </div>
      )}
      {d.tone === "error" && (
        <p role="alert" className="text-sm">
          {summarizeError(state.error)}
        </p>
      )}
      {retryError && (
        <p role="alert" className="text-sm text-red-700 dark:text-red-400">
          {retryError}
        </p>
      )}
      {showRetry && (
        <OutlineButton type="button" onClick={retry} disabled={retrying}>
          Reintentar
        </OutlineButton>
      )}
    </div>
  );
}
