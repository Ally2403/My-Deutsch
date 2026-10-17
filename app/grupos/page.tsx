import { Suspense } from "react";
import { OutlineButton, Page } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";

// Pantalla inicial tras ingresar. Aquí irán los grupos del usuario (RF-06 a RF-08).
async function Saludo() {
  const supabase = await createClient();
  const { data: profile } = await supabase.from("profiles").select("display_name").single();
  return <h1 className="text-2xl font-bold">Hola, {profile?.display_name || "estudiante"}</h1>;
}

export default function GruposPage() {
  return (
    <Page>
      <Suspense fallback={<h1 className="text-2xl font-bold">Hola</h1>}>
        <Saludo />
      </Suspense>
      <p className="mt-3 text-muted">Aún no perteneces a ningún grupo.</p>
      <form action="/auth/signout" method="post" className="mt-8">
        <OutlineButton type="submit">Cerrar sesión</OutlineButton>
      </form>
    </Page>
  );
}
