"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Input, OutlineButton } from "@/components/ui";
import {
  DELETE_PHRASE,
  LEVELS,
  isDeleteConfirmed,
  parseLevel,
  validateDisplayName,
} from "@/lib/domain/profile";
import { createClient } from "@/lib/supabase/client";

/** RF-05: nombre visible y nivel de alemán. */
export function ProfileForm({
  userId,
  displayName,
  level,
}: {
  userId: string;
  displayName: string;
  level: string | null;
}) {
  const router = useRouter();
  const [name, setName] = useState(displayName);
  const [lvl, setLvl] = useState(level ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaved(false);
    const invalid = validateDisplayName(name);
    if (invalid) return setError(invalid);
    setBusy(true);
    setError(null);
    const { error: e2 } = await createClient()
      .from("profiles")
      .update({ display_name: name.trim(), level: parseLevel(lvl) })
      .eq("id", userId);
    setBusy(false);
    if (e2)
      return setError("No se pudo guardar el perfil. Inténtalo de nuevo.");
    setSaved(true);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="card mt-4 flex flex-col gap-4 p-5">
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Nombre visible
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={60}
          required
        />
        <span className="text-sm font-normal text-muted">
          Lo ven los miembros de tus grupos.
        </span>
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Nivel de alemán
        <select
          value={lvl}
          onChange={(e) => setLvl(e.target.value)}
          className="min-h-11 rounded-control border border-border bg-surface px-3 text-base"
        >
          <option value="">Sin indicar</option>
          {LEVELS.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </select>
      </label>
      {error && (
        <p role="alert" className="text-danger">
          {error}
        </p>
      )}
      {saved && <p role="status">Perfil guardado.</p>}
      <Button type="submit" loading={busy} className="self-start">
        Guardar cambios
      </Button>
    </form>
  );
}

/** RF-05 c2: eliminar la cuenta con confirmación escrita. */
export function DeleteAccount() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/cuenta/eliminar", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ confirm: typed }),
      });
      if (!res.ok) throw new Error(String(res.status));
      router.push("/");
      router.refresh();
    } catch {
      setBusy(false);
      setError("No se pudo eliminar la cuenta. Inténtalo de nuevo.");
    }
  }

  if (!open)
    return (
      <OutlineButton onClick={() => setOpen(true)}>
        Eliminar mi cuenta
      </OutlineButton>
    );
  return (
    <div role="group" aria-label="Eliminar cuenta" className="card p-4">
      <p>
        Se borrarán tu diccionario, tu progreso y tus respuestas. Los libros que
        subiste se quedan en sus grupos. No se puede deshacer. Para confirmar
        escribe <strong>{DELETE_PHRASE}</strong>.
      </p>
      <label className="sr-only" htmlFor="delete-account-confirm">
        Escribe {DELETE_PHRASE} para confirmar
      </label>
      <Input
        id="delete-account-confirm"
        className="mt-2"
        value={typed}
        onChange={(e) => setTyped(e.target.value)}
        autoComplete="off"
      />
      {error && (
        <p role="alert" className="mt-2 text-danger">
          {error}
        </p>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          loading={busy}
          disabled={!isDeleteConfirmed(typed)}
          onClick={remove}
        >
          Eliminar cuenta definitivamente
        </Button>
        <OutlineButton disabled={busy} onClick={() => setOpen(false)}>
          Cancelar
        </OutlineButton>
      </div>
    </div>
  );
}
