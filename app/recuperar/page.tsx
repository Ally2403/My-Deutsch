"use client";

import Link from "next/link";
import { useState } from "react";
import { Button, Input, Page } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";

export default function RecuperarPage() {
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const email = String(new FormData(e.currentTarget).get("email"));
    setBusy(true);
    await createClient().auth.resetPasswordForEmail(email, {
      redirectTo: `${location.origin}/auth/callback?next=/cuenta/nueva-contrasena`,
    });
    // RF-04: mismo mensaje exista o no el correo.
    setSent(true);
  }

  return (
    <Page>
      <h1 className="text-2xl font-bold">Recuperar contraseña</h1>
      {sent ? (
        <p className="mt-4">
          Si el correo está registrado, te enviamos un enlace para definir una
          nueva contraseña. El enlace vale 1 hora.
        </p>
      ) : (
        <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-4">
          <label className="flex flex-col gap-1">
            Correo
            <Input name="email" type="email" autoComplete="email" required />
          </label>
          <Button type="submit" disabled={busy}>
            Enviar enlace
          </Button>
        </form>
      )}
      <p className="mt-6 text-sm">
        <Link href="/login" className="tap-link underline">
          Volver a iniciar sesión
        </Link>
      </p>
    </Page>
  );
}
