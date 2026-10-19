import { notFound } from "next/navigation";
import { Suspense } from "react";
import { BookStatus } from "@/components/book-status";
import { backHref, chooseView, isAdminInAny } from "@/lib/domain/book-reader";
import {
  canRetry,
  isOwnerOrAdmin,
  resolvePageCount,
} from "@/lib/domain/book-status";
import { createClient } from "@/lib/supabase/server";
import { BookHeader } from "./book-header";
import { BookReader } from "./book-reader";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

async function Libro({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();

  const supabase = await createClient();
  // RN-03: RLS decide si la persona ve el libro.
  const { data: book } = await supabase
    .from("books")
    .select("id, title, status, page_count, uploaded_by")
    .eq("id", id)
    .maybeSingle();
  if (!book) notFound();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [pagesRes, jobRes, linksRes, progressRes] = await Promise.all([
    supabase
      .from("pages")
      .select("number", { count: "exact", head: true })
      .eq("book_id", id),
    supabase
      .from("jobs")
      .select("status, pages_done, pages_total, error, created_at, started_at")
      .eq("book_id", id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("group_books")
      .select("group_id, added_at")
      .eq("book_id", id)
      .order("added_at", { ascending: true }),
    // RF-20: última página guardada (RLS: solo el progreso propio).
    user
      ? supabase
          .from("reading_progress")
          .select("last_page, pages_read")
          .eq("book_id", id)
          .eq("user_id", user.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  const total = pagesRes.count ?? 0;
  const job = jobRes.data;
  const groupIds = (linksRes.data ?? []).map((l) => l.group_id);

  const { data: memberships } =
    user && groupIds.length
      ? await supabase
          .from("group_members")
          .select("group_id, role")
          .eq("user_id", user.id)
          .in("group_id", groupIds)
      : { data: [] };
  const mine = memberships ?? [];
  const isAdmin = isAdminInAny(groupIds, mine);

  const ownerOrAdmin =
    !!user &&
    isOwnerOrAdmin({ uploadedBy: book.uploaded_by, userId: user.id, isAdmin });
  const retry =
    !!user &&
    canRetry({
      status: book.status,
      uploadedBy: book.uploaded_by,
      userId: user.id,
      isAdmin,
      jobCreatedAt: job?.created_at ?? null,
      jobStartedAt: job?.started_at ?? null,
    });
  const showStatus = book.status !== "ready" || chooseView(total) === "empty";

  return (
    <>
      <BookHeader backHref={backHref(groupIds, mine)} title={book.title}>
        {showStatus && (
          <div className="my-2">
            <BookStatus
              bookId={book.id}
              initial={{
                bookStatus: book.status,
                jobStatus: job?.status ?? null,
                pagesDone: job?.pages_done ?? 0,
                pageCount: resolvePageCount(book.page_count, job?.pages_total),
                error: job?.error ?? null,
              }}
              canRetry={retry}
              ownerOrAdmin={ownerOrAdmin}
              jobCreatedAt={job?.created_at ?? null}
              jobStartedAt={job?.started_at ?? null}
            />
          </div>
        )}
        {chooseView(total) === "empty" && (
          <p className="text-muted">Aún no hay páginas listas.</p>
        )}
      </BookHeader>
      {chooseView(total) === "reader" && (
        <div className="min-h-0 flex-1">
          <BookReader
            key={book.id}
            bookId={book.id}
            total={total}
            userId={user?.id}
            lastPage={progressRes.data?.last_page ?? null}
            pagesRead={progressRes.data?.pages_read ?? []}
          />
        </div>
      )}
    </>
  );
}

export default function LibroPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <main className="flex h-dvh min-h-0 flex-col">
      <Suspense fallback={<p className="p-4 text-muted">Cargando…</p>}>
        <Libro params={params} />
      </Suspense>
    </main>
  );
}
