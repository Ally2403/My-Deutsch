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
    <Page>
      <h1 className="text-2xl font-bold">Nueva contraseña</h1>
      <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-4">
        <label className="flex flex-col gap-1">
          Contraseña
          <Input
            name="password"
            type="password"
            autoComplete="new-password"
            required
          />
          <span className="text-sm text-muted">
            Mínimo 8 caracteres, con una letra y un número.
          </span>
        </label>
        {error && (
          <p role="alert" className="text-gender-f">
            {error}
          </p>
        )}
        <Button type="submit" disabled={busy}>
          Guardar
        </Button>
      </form>
    </Page>
  );
}
