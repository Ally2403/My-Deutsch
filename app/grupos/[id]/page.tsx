import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ShareInvite } from "@/components/share-invite";
import { Page } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

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

  return (
    <>
      <h1 className="text-2xl font-bold">{group.name}</h1>

      <div className="mt-6">
        <ShareInvite code={group.invite_code} groupName={group.name} />
      </div>

      <h2 className="mt-8 text-lg font-semibold">Libros</h2>
      <p className="mt-2 text-muted">Aún no hay libros en este grupo.</p>

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
