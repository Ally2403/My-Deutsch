"use client";

import { useState } from "react";
import { OutlineButton } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";

// RF-03: el inicio de sesión de Google es por redirección (también en iOS y en la PWA).
export function GoogleButton({ next }: { next: string }) {
  const [busy, setBusy] = useState(false);

  async function signIn() {
    setBusy(true);
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
  }

  return (
    <OutlineButton
      type="button"
      onClick={signIn}
      disabled={busy}
      className="w-full"
    >
      Continuar con Google
    </OutlineButton>
  );
}
