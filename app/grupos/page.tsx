import Link from "next/link";
import { Suspense } from "react";
import { CreateGroupForm, JoinGroupForm } from "@/components/group-forms";
import { OutlineButton, Page } from "@/components/ui";
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
      <h1 className="text-2xl font-bold">
        Hola, {profile?.display_name || "estudiante"}
      </h1>
      <Link
        href="/diccionario"
        className="card pressable mt-4 flex min-h-12 items-center justify-between px-4 py-3 font-semibold"
      >
        Mi diccionario
        <span aria-hidden="true" className="text-muted">
          ›
        </span>
      </Link>
      <h2 className="mt-6 text-lg font-semibold">Mis grupos</h2>
      {groups && groups.length > 0 ? (
        <ul className="mt-3 flex flex-col gap-3">
          {groups.map((g) => (
            <li key={g.id}>
              <Link
                href={`/grupos/${g.id}`}
                className="card pressable flex min-h-12 items-center justify-between px-4 py-3"
              >
                <span className="font-medium">{g.name}</span>
                {roles.get(g.id) === "admin" && (
                  <span className="text-sm text-muted">Administrador</span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-muted">Aún no perteneces a ningún grupo.</p>
      )}
    </>
  );
}

export default function GruposPage() {
  return (
    <Page>
      <Suspense fallback={<h1 className="text-2xl font-bold">Hola</h1>}>
        <MisGrupos />
      </Suspense>

      <h2 className="mt-8 text-lg font-semibold">Crear un grupo</h2>
      <div className="mt-3">
        <CreateGroupForm />
      </div>

      <h2 className="mt-8 text-lg font-semibold">Unirme a un grupo</h2>
      <div className="mt-3">
        <JoinGroupForm />
      </div>

      <form action="/auth/signout" method="post" className="mt-10">
        <OutlineButton type="submit">Cerrar sesión</OutlineButton>
      </form>
    </Page>
  );
}
