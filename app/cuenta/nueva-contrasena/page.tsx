"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Input, Page } from "@/components/ui";
import { validatePassword } from "@/lib/domain/password";
import { createClient } from "@/lib/supabase/client";

export default function NuevaContrasenaPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const password = String(new FormData(e.currentTarget).get("password"));
    const invalid = validatePassword(password);
    if (invalid) return setError(invalid);
    setBusy(true);
    const { error } = await createClient().auth.updateUser({ password });
    if (error) {
      setBusy(false);
      return setError(
        "No pudimos cambiar la contraseña. Pide un enlace nuevo.",
      );
    }
    router.replace("/grupos");
  }

  return (
    <Page width="narrow"><div className="card p-6 sm:p-8">
      <h1 className="font-display text-3xl font-extrabold">Nueva contraseña</h1>
      <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-4">
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
            {error}
          </p>
        )}
        <Button type="submit" className="w-full" disabled={busy}>
          Guardar
        </Button>
      </form>
    </div></Page>
  );
}
