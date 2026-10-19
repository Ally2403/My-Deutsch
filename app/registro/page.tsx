"use client";

import Link from "next/link";
import { useState } from "react";
import { GoogleButton } from "@/components/google-button";
import { Button, Input, Page } from "@/components/ui";
import { validatePassword } from "@/lib/domain/password";
import { createClient } from "@/lib/supabase/client";

export default function RegistroPage() {
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email"));
    const password = String(form.get("password"));

    // RF-01 criterio 3: el error aparece antes de enviar la solicitud.
    const invalid = validatePassword(password);
    if (invalid) return setError(invalid);

    setBusy(true);
    setError(null);
    const { data, error } = await createClient().auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${location.origin}/auth/callback` },
    });
    setBusy(false);
    if (error)
      return setError("No pudimos crear la cuenta. Inténtalo de nuevo.");
    // Con confirmación de correo, un correo ya registrado vuelve sin identidades.
    if (data.user && data.user.identities?.length === 0) {
      return setError("Este correo ya tiene una cuenta");
    }
    setSent(true);
  }

  if (sent) {
    return (
      <Page width="narrow"><div className="card p-6 sm:p-8">
        <h1 className="font-display text-3xl font-extrabold">Revisa tu correo</h1>
        <p className="mt-3">
          Te enviamos un enlace para verificar tu cuenta. Ábrelo y luego inicia
          sesión.
        </p>
        <p className="mt-6">
          <Link href="/login" className="tap-link underline">
            Ir a iniciar sesión
          </Link>
        </p>
      </div></Page>
    );
  }

  return (
    <Page width="narrow"><div className="card p-6 sm:p-8">
      <h1 className="font-display text-3xl font-extrabold">Crear cuenta</h1>
      <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-4">
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Correo
          <Input name="email" type="email" autoComplete="email" required />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Contraseña
          <Input
            name="password"
            type="password"
            autoComplete="new-password"
            required
          />
          <span className="text-sm font-normal text-muted">
            Mínimo 8 caracteres, con una letra y un número.
          </span>
        </label>
        {error && (
          <p role="alert" className="text-danger">
            {error}{" "}
            {error.startsWith("Este correo") && (
              <Link href="/login" className="tap-link underline">
                Iniciar sesión
              </Link>
            )}
          </p>
        )}
        <Button type="submit" className="w-full" disabled={busy}>
          Crear cuenta
        </Button>
      </form>
      <div className="my-5 flex items-center gap-3 text-sm text-muted before:h-px before:flex-1 before:bg-border after:h-px after:flex-1 after:bg-border">o</div>
      <GoogleButton next="/grupos" />
      <p className="mt-6 text-sm">
        ¿Ya tienes cuenta?{" "}
        <Link href="/login" className="tap-link underline">
          Iniciar sesión
        </Link>
      </p>
    </div></Page>
  );
}
