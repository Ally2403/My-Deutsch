import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { BookStatus } from "@/components/book-status";
import { backHref, chooseView, isAdminInAny } from "@/lib/domain/book-reader";
import { canRetry, isOwnerOrAdmin } from "@/lib/domain/book-status";
import { createClient } from "@/lib/supabase/server";
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

  const [pagesRes, jobRes, linksRes] = await Promise.all([
    supabase
      .from("pages")
      .select("number", { count: "exact", head: true })
      .eq("book_id", id),
    supabase
      .from("jobs")
      .select("status, pages_done, error, created_at, started_at")
      .eq("book_id", id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("group_books")
      .select("group_id, added_at")
      .eq("book_id", id)
      .order("added_at", { ascending: true }),
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
      <header className="mx-auto w-full max-w-md shrink-0 px-4 pt-2">
        <p className="text-sm">
          <Link
            href={backHref(groupIds, mine)}
            className="inline-flex min-h-11 items-center underline"
          >
            ← Biblioteca
          </Link>
        </p>
        <h1 className="truncate text-xl font-bold">{book.title}</h1>
        {showStatus && (
          <div className="my-2">
            <BookStatus
              bookId={book.id}
              initial={{
                bookStatus: book.status,
                jobStatus: job?.status ?? null,
                pagesDone: job?.pages_done ?? 0,
                pageCount: book.page_count,
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
      </header>
      {chooseView(total) === "reader" && (
        <div className="min-h-0 flex-1">
          <BookReader bookId={book.id} total={total} />
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
