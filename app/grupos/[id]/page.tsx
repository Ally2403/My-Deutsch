import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { BookCard } from "@/components/book-card";
import { ShareInvite } from "@/components/share-invite";
import { Page } from "@/components/ui";
import { UploadBook } from "@/components/upload-book";
import { canRetry, isOwnerOrAdmin, resolvePageCount } from "@/lib/domain/book-status";
import { createClient } from "@/lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

type JobRow = {
  book_id: string;
  status: string;
  pages_done: number;
  pages_total: number | null;
  error: string | null;
  created_at: string;
  started_at: string | null;
};

async function Grupo({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();

  const supabase = await createClient();
  const { data: group } = await supabase
    .from("groups")
    .select("id, name, invite_code")
    .eq("id", id)
    .maybeSingle();
  if (!group) notFound(); // RLS: quien no es miembro no ve el grupo

  // RF-08: solo nombre, foto y rol; nunca vocabulario ni progreso (RN-04).
  const { data: members } = await supabase
    .from("group_members")
    .select("user_id, role, joined_at")
    .eq("group_id", id)
    .order("joined_at");
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_url")
    .in(
      "id",
      (members ?? []).map((m) => m.user_id),
    );
  const byId = new Map((profiles ?? []).map((p) => [p.id, p]));

  // RF-13, RF-14: libros del grupo; RLS filtra lo visible (RN-03).
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isAdmin =
    !!user &&
    (members ?? []).some((m) => m.user_id === user.id && m.role === "admin");
  const { data: links } = await supabase
    .from("group_books")
    .select("book_id, added_at")
    .eq("group_id", id)
    .order("added_at", { ascending: false });
  const bookIds = (links ?? []).map((l) => l.book_id);
  const [booksRes, jobsRes, coversRes] = bookIds.length
    ? await Promise.all([
        supabase
          .from("books")
          .select("id, title, status, page_count, uploaded_by")
          .in("id", bookIds),
        supabase
          .from("jobs")
          .select("book_id, status, pages_done, pages_total, error, created_at, started_at")
          .in("book_id", bookIds)
          .order("created_at", { ascending: false }),
        supabase
          .from("pages")
          .select("book_id")
          .in("book_id", bookIds)
          .eq("number", 1),
      ])
    : [null, null, null];
  const booksById = new Map((booksRes?.data ?? []).map((b) => [b.id, b]));
  // Más reciente primero: el primero de cada libro es su último job.
  const lastJob = new Map<string, JobRow>();
  for (const j of jobsRes?.data ?? [])
    if (!lastJob.has(j.book_id)) lastJob.set(j.book_id, j);
  const withPages = new Set((coversRes?.data ?? []).map((p) => p.book_id));
  const books = bookIds.flatMap((bid) => {
    const b = booksById.get(bid);
    return b ? [b] : [];
  });

  return (
    <>
      <h1 className="text-2xl font-bold">{group.name}</h1>

      <div className="mt-6">
        <ShareInvite code={group.invite_code} groupName={group.name} />
      </div>

      <h2 className="mt-8 text-lg font-semibold">Libros</h2>
      <div className="mt-3">
        <UploadBook groupId={group.id} />
      </div>
      {books.length === 0 ? (
        <p className="mt-4 text-muted">Aún no hay libros en este grupo.</p>
      ) : (
        <ul className="mt-4 flex flex-col gap-3">
          {books.map((b) => {
            const job = lastJob.get(b.id);
            return (
              <BookCard
                key={b.id}
                id={b.id}
                title={b.title}
                pageCount={b.page_count}
                hasPublishedPages={withPages.has(b.id)}
                ownerOrAdmin={
                  !!user &&
                  isOwnerOrAdmin({
                    uploadedBy: b.uploaded_by,
                    userId: user.id,
                    isAdmin,
                  })
                }
                jobCreatedAt={job?.created_at ?? null}
                jobStartedAt={job?.started_at ?? null}
                canRetry={
                  !!user &&
                  canRetry({
                    status: b.status,
                    uploadedBy: b.uploaded_by,
                    userId: user.id,
                    isAdmin,
                    jobCreatedAt: job?.created_at ?? null,
                    jobStartedAt: job?.started_at ?? null,
                  })
                }
                status={{
                  bookStatus: b.status,
                  jobStatus: job?.status ?? null,
                  pagesDone: job?.pages_done ?? 0,
                  pageCount: resolvePageCount(b.page_count, job?.pages_total),
                  error: job?.error ?? null,
                }}
              />
            );
          })}
        </ul>
      )}

      <h2 className="mt-8 text-lg font-semibold">
        Miembros ({members?.length ?? 0})
      </h2>
      <ul className="mt-3 flex flex-col gap-3">
        {(members ?? []).map((m) => {
          const p = byId.get(m.user_id);
          return (
            <li key={m.user_id} className="flex min-h-11 items-center gap-3">
              {p?.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={p.avatar_url}
                  alt=""
                  width={36}
                  height={36}
                  referrerPolicy="no-referrer"
                  className="size-9 rounded-full"
                />
              ) : (
                <span
                  aria-hidden
                  className="flex size-9 items-center justify-center rounded-full border border-border"
                >
                  {(p?.display_name || "?").charAt(0).toUpperCase()}
                </span>
              )}
              <span className="flex-1">{p?.display_name || "Estudiante"}</span>
              <span className="text-sm text-muted">
                {m.role === "admin" ? "Administrador" : "Miembro"}
              </span>
            </li>
          );
        })}
      </ul>
    </>
  );
}

export default function GrupoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Page>
      <p className="mb-4 text-sm">
        <Link href="/grupos" className="underline">
          ← Mis grupos
        </Link>
      </p>
      <Suspense fallback={<p className="text-muted">Cargando…</p>}>
        <Grupo params={params} />
      </Suspense>
    </Page>
  );
}
