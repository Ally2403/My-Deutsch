import Link from "next/link";
import { Suspense } from "react";
import { Page } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { DeleteAccount, ProfileForm } from "./profile-form";

async function Perfil() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return <p className="text-muted">Inicia sesión para ver tu perfil.</p>;
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, level")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <>
      <p className="mt-1 text-muted">{user.email}</p>
      <ProfileForm
        userId={user.id}
        displayName={profile?.display_name ?? ""}
        level={profile?.level ?? null}
      />
      <h2 className="mt-10 font-display text-lg font-bold">Eliminar cuenta</h2>
      <div className="mt-3">
        <DeleteAccount />
      </div>
    </>
  );
}

export default function PerfilPage() {
  return (
    <Page>
      <Link href="/grupos" className="tap-link text-sm text-muted underline">
        Volver a mis grupos
      </Link>
      <h1 className="mt-2 font-display text-3xl font-extrabold">Mi perfil</h1>
      <Suspense fallback={<p className="mt-4 text-muted">Cargando…</p>}>
        <Perfil />
      </Suspense>
    </Page>
  );
}
