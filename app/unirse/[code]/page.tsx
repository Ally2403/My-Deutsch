"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { Page } from "@/components/ui";
import {
  groupErrorMessage,
  isValidInviteCode,
  normalizeInviteCode,
} from "@/lib/domain/group";
import { createClient } from "@/lib/supabase/client";

// RF-07: abrir el enlace de invitación. Sin sesión, el proxy envía a /login y vuelve aquí.
function Unirse() {
  const { code: raw } = useParams<{ code: string }>();
  const router = useRouter();
  const code = normalizeInviteCode(raw);
  const valid = isValidInviteCode(code);
  const [joinError, setJoinError] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (!valid || started.current) return;
    started.current = true;
    createClient()
      .rpc("join_group", { p_code: code })
      .then(({ data, error }) => {
        if (error || !data) setJoinError(groupErrorMessage(error ?? {}));
        else router.replace(`/grupos/${data}`);
      });
  }, [valid, code, router]);

  const error = valid ? joinError : "Código no válido";

  return (
    <Page>
      {error ? (
        <>
          <h1 className="text-2xl font-bold">{error}</h1>
          <p className="mt-4">
            <Link href="/grupos" className="underline">
              Ir a mis grupos
            </Link>
          </p>
        </>
      ) : (
        <p className="text-muted">Uniéndote al grupo…</p>
      )}
    </Page>
  );
}

export default function UnirsePage() {
  return (
    <Suspense>
      <Unirse />
    </Suspense>
  );
}
