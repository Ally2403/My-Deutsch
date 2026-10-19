"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { GoogleButton } from "@/components/google-button";
import { Button, Input, Page } from "@/components/ui";
import { safeNext } from "@/lib/domain/redirect";
import { createClient } from "@/lib/supabase/client";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  const [error, setError] = useState<string | null>(
    params.get("error") ? "El enlace no es válido o ya venció." : null,
  );
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setBusy(true);
    setError(null);
    const { error } = await createClient().auth.signInWithPassword({
      email: String(form.get("email")),
      password: String(form.get("password")),
    });
    if (error) {
      // RF-02: el mensaje no revela cuál campo falló.
      setError(
        error.code === "email_not_confirmed"
          ? "Confirma tu correo con el enlace que te enviamos."
          : "Correo o contraseña incorrectos",
      );
      setBusy(false);
      return;
    }
    router.replace(next);
    router.refresh();
  }

  return (
    <Page width="narrow"><div className="card p-6 sm:p-8">
      <h1 className="font-display text-3xl font-extrabold">Iniciar sesión</h1>
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
            autoComplete="current-password"
            required
          />
        </label>
        {error && (
          <p role="alert" className="text-danger">
            {error}
          </p>
        )}
        <Button type="submit" className="w-full" disabled={busy}>
          Entrar
        </Button>
      </form>
      <div className="my-5 flex items-center gap-3 text-sm text-muted before:h-px before:flex-1 before:bg-border after:h-px after:flex-1 after:bg-border">o</div>
      <GoogleButton next={next} />
      <p className="mt-6 text-sm">
        <Link href="/recuperar" className="tap-link underline">
          Olvidé mi contraseña
        </Link>
        {" · "}
        <Link href="/registro" className="tap-link underline">
          Crear cuenta
        </Link>
      </p>
    </div></Page>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
