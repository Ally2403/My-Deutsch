"use client";

import Link from "next/link";
import { useState } from "react";
import { BookStatus } from "@/components/book-status";
import type { BookStatusInput } from "@/lib/domain/book-status";

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
}) {
  const [coverFailed, setCoverFailed] = useState(false);
  const showImage = hasPublishedPages && !coverFailed;
  const openable = hasPublishedPages || status.bookStatus === "ready";
  const initial = (title.trim().charAt(0) || "?").toUpperCase();

  const head = (
    <>
      <div
        className="relative w-20 shrink-0 overflow-hidden rounded border border-border bg-border/30"
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
        <p className="text-sm text-muted">0 % leído</p>
      </div>
    </>
  );

  return (
    <li className="flex flex-col gap-3 rounded-lg border border-border p-3">
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
    </li>
  );
}
