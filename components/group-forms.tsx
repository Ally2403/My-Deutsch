"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Input } from "@/components/ui";
import {
  groupErrorMessage,
  isValidInviteCode,
  normalizeInviteCode,
  validateGroupName,
} from "@/lib/domain/group";
import { createClient } from "@/lib/supabase/client";

export function CreateGroupForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const name = String(new FormData(e.currentTarget).get("name")).trim();
    const invalid = validateGroupName(name);
    if (invalid) return setError(invalid);
    setBusy(true);
    setError(null);
    const { data, error } = await createClient().rpc("create_group", {
      p_name: name,
    });
    if (error || !data) {
      setBusy(false);
      return setError(groupErrorMessage(error ?? {}));
    }
    router.push(`/grupos/${data}`);
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1">
        Nombre del grupo
        <Input
          name="name"
          placeholder="Alemán B1 – 2026-2"
          maxLength={60}
          required
        />
      </label>
      {error && (
        <p role="alert" className="text-gender-f">
          {error}
        </p>
      )}
      <Button type="submit" disabled={busy}>
        Crear grupo
      </Button>
    </form>
  );
}

export function JoinGroupForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const code = normalizeInviteCode(
      String(new FormData(e.currentTarget).get("code")),
    );
    if (!isValidInviteCode(code)) return setError("Código no válido");
    setBusy(true);
    setError(null);
    const { data, error } = await createClient().rpc("join_group", {
      p_code: code,
    });
    if (error || !data) {
      setBusy(false);
      return setError(groupErrorMessage(error ?? {}));
    }
    router.push(`/grupos/${data}`);
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1">
        Código de invitación
        <Input
          name="code"
          placeholder="ABCD2345"
          autoCapitalize="characters"
          autoComplete="off"
          required
        />
      </label>
      {error && (
        <p role="alert" className="text-gender-f">
          {error}
        </p>
      )}
      <Button type="submit" disabled={busy}>
        Unirme
      </Button>
    </form>
  );
}
