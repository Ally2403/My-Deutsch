import Link from "next/link";
import { Suspense } from "react";
import { CreateGroupForm, JoinGroupForm } from "@/components/group-forms";
import { ReviewTodayCard } from "@/components/review-today-card";
import { OutlineButton, Page } from "@/components/ui";
import {
  loadCardDues,
  loadRecentLogs,
  loadWordFlags,
} from "@/lib/supabase/review-data";
import { createClient } from "@/lib/supabase/server";

async function MisGrupos() {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const me = claims?.claims.sub;

  const [{ data: profile }, { data: groups }, { data: mine }] =
    await Promise.all([
      supabase.from("profiles").select("display_name").maybeSingle(),
      supabase
        .from("groups")
        .select("id, name")
        .order("created_at", { ascending: false }),
      supabase
        .from("group_members")
        .select("group_id, role")
        .eq("user_id", me ?? ""),
    ]);
  const roles = new Map((mine ?? []).map((m) => [m.group_id, m.role]));

  return (
    <>
      <h1 className="font-display text-3xl font-extrabold">
        Hola, {profile?.display_name || "estudiante"}
      </h1>
      <p className="mt-1 text-muted">Elige un grupo para ver su biblioteca.</p>
      <h2 className="mt-8 font-display text-xl font-bold">Mis grupos</h2>
      {groups && groups.length > 0 ? (
        <ul className="mt-3 grid gap-3 sm:grid-cols-2">
          {groups.map((g) => (
            <li key={g.id}>
              <Link
                href={`/grupos/${g.id}`}
                className="card pressable flex min-h-16 items-center gap-3 px-4 py-3"
              >
                <span
                  aria-hidden="true"
                  className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft font-display font-bold text-accent"
                >
                  {g.name.trim().charAt(0).toUpperCase() || "G"}
                </span>
                <span className="min-w-0 flex-1 break-words font-semibold">
                  {g.name}
                </span>
                {roles.get(g.id) === "admin" && (
                  <span className="rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-semibold text-accent">
                    Admin
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="card mt-3 p-5 text-center text-muted">
          Aún no perteneces a ningún grupo. Crea uno o únete con un código.
        </p>
      )}
    </>
  );
}

async function RepasoDeHoy() {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const me = claims?.claims.sub;
  if (!me) return null;
  const [words, cards, recentLogs] = await Promise.all([
    loadWordFlags(supabase, me),
    loadCardDues(supabase, me),
    loadRecentLogs(supabase, me),
  ]);
  return (
    <ReviewTodayCard words={words} cards={cards} recentLogs={recentLogs} />
  );
}

export default function GruposPage() {
  return (
    <Page width="wide">
      <Suspense
        fallback={
          <h1 className="font-display text-3xl font-extrabold">Hola</h1>
        }
      >
        <MisGrupos />
      </Suspense>

      <Suspense
        fallback={<div className="card mt-6 min-h-24" aria-hidden="true" />}
      >
        <RepasoDeHoy />
      </Suspense>

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <section className="card p-5">
          <h2 className="mb-3 font-display text-lg font-bold">
            Crear un grupo
          </h2>
          <CreateGroupForm />
        </section>
        <section className="card p-5">
          <h2 className="mb-3 font-display text-lg font-bold">
            Unirme a un grupo
          </h2>
          <JoinGroupForm />
        </section>
      </div>

      <form action="/auth/signout" method="post" className="mt-10">
        <OutlineButton type="submit">Cerrar sesión</OutlineButton>
      </form>
    </Page>
  );
}
