"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { BookStatus } from "@/components/book-status";
import { Button, OutlineButton } from "@/components/ui";
import type { BookStatusInput } from "@/lib/domain/book-status";
import { createClient } from "@/lib/supabase/client";

/** RF-13, RF-14: tarjeta de libro de la biblioteca. */

const COVER_RATIO = "1600 / 2263";

export function BookCard({
  id,
  title,
  pageCount,
  hasPublishedPages,
  canRetry,
  ownerOrAdmin,
  jobCreatedAt,
  jobStartedAt,
  status,
  percentRead = 0,
  groupId,
  canRemove = false,
}: {
  id: string;
  title: string;
  pageCount: number | null;
  hasPublishedPages: boolean;
  canRetry: boolean;
  ownerOrAdmin?: boolean;
  jobCreatedAt?: string | null;
  jobStartedAt?: string | null;
  status: BookStatusInput;
  /** RF-20, RN-14: porcentaje de páginas leídas por esta persona. */
  percentRead?: number;
  /** RF-15: grupo desde el que se quita el libro y si esta persona puede hacerlo (RN-08). */
  groupId?: string;
  canRemove?: boolean;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [removeError, setRemoveError] = useState<string | null>(null);

  async function remove() {
    if (!groupId) return;
    setRemoving(true);
    setRemoveError(null);
    // RLS decide quién puede; `select()` permite saber si de verdad se borró una fila.
    const { data, error } = await createClient()
      .from("group_books")
      .delete()
      .eq("group_id", groupId)
      .eq("book_id", id)
      .select("book_id");
    setRemoving(false);
    if (error || !data?.length) {
      setRemoveError("No se pudo quitar el libro. Inténtalo de nuevo.");
      return;
    }
    router.refresh();
  }
  const [coverFailed, setCoverFailed] = useState(false);
  const showImage = hasPublishedPages && !coverFailed;
  const openable = hasPublishedPages || status.bookStatus === "ready";
  const initial = (title.trim().charAt(0) || "?").toUpperCase();

  const head = (
    <>
      <div
        className="relative w-20 shrink-0 overflow-hidden rounded-lg border border-border bg-accent-soft"
        style={{ aspectRatio: COVER_RATIO }}
      >
        {showImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            loading="lazy"
            src={`/api/libros/${id}/paginas/1/imagen`}
            alt=""
            onError={() => setCoverFailed(true)}
            className="absolute inset-0 size-full object-cover"
          />
        ) : (
          <span
            aria-hidden
            className="absolute inset-0 flex items-center justify-center text-2xl font-semibold text-muted"
          >
            {initial}
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="break-words font-semibold">{title}</p>
        {pageCount !== null && (
          <p className="text-sm text-muted">{pageCount} páginas</p>
        )}
        <p className="text-sm text-muted">{percentRead} % leído</p>
      </div>
    </>
  );

  return (
    <li className="card flex flex-col gap-3 p-3">
      {openable ? (
        <Link
          href={`/libros/${id}`}
          className="flex min-h-11 items-start gap-3"
        >
          {head}
        </Link>
      ) : (
        <div className="flex items-start gap-3">{head}</div>
      )}
      <BookStatus
        bookId={id}
        initial={status}
        canRetry={canRetry}
        ownerOrAdmin={ownerOrAdmin}
        jobCreatedAt={jobCreatedAt}
        jobStartedAt={jobStartedAt}
      />
      {canRemove && groupId && (
        <div className="border-t border-border pt-3">
          {confirming ? (
            <div role="group" aria-label={`Quitar ${title} del grupo`}>
              <p className="text-sm">
                ¿Quitar «{title}» de este grupo? Si ningún otro grupo lo usa, sus archivos se
                eliminan en 7 días. Tus palabras guardadas se conservan.
              </p>
              {removeError && (
                <p role="alert" className="mt-2 text-sm text-gender-f">
                  {removeError}
                </p>
              )}
              <div className="mt-2 flex flex-wrap gap-2">
                <Button loading={removing} onClick={remove}>
                  Sí, quitar libro
                </Button>
                <OutlineButton disabled={removing} onClick={() => setConfirming(false)}>
                  Cancelar
                </OutlineButton>
              </div>
            </div>
          ) : (
            <button
              type="button"
              className="tap-link min-h-11 text-sm text-muted underline"
              onClick={() => setConfirming(true)}
            >
              Quitar del grupo
            </button>
          )}
        </div>
      )}
    </li>
  );
}
