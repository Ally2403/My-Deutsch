"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ThemeToggle } from "@/components/theme-toggle";
import { syncPrefsOnce } from "@/lib/prefs/client";
import { createClient } from "@/lib/supabase/client";

const LINKS = [
  { href: "/grupos", label: "Grupos" },
  { href: "/diccionario", label: "Diccionario" },
  { href: "/perfil", label: "Perfil" },
] as const;

/** Sesión del navegador (se lee de las cookies, sin red); null hasta saberla. */
function useSignedIn() {
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => {
      setSignedIn(!!data.session);
      if (data.session) void syncPrefsOnce();
    });
    const { data } = supabase.auth.onAuthStateChange((_e, session) =>
      setSignedIn(!!session),
    );
    return () => data.subscription.unsubscribe();
  }, []);
  return signedIn;
}

function Nav() {
  const signedIn = useSignedIn();
  if (!signedIn) return null;
  return (
    <nav aria-label="Principal" className="flex items-center">
      {LINKS.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          prefetch={false}
          className="pressable inline-flex min-h-11 items-center rounded-full px-2.5 text-sm font-medium text-muted hover:text-foreground sm:px-3.5 sm:text-base"
        >
          {l.label}
        </Link>
      ))}
    </nav>
  );
}

/** RF-44: barra superior común: marca, navegación (solo con sesión) y selector de tema. */
export function AppBar() {
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-surface/85 backdrop-blur">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-2 px-3 sm:px-6">
        <Link
          href="/"
          className="pressable inline-flex min-h-11 min-w-11 items-center justify-center gap-2 font-display text-lg font-extrabold tracking-tight"
        >
          <span
            aria-hidden="true"
            className="flex size-7 items-center justify-center rounded-lg bg-accent text-sm text-on-accent"
          >
            D
          </span>
          <span className="max-[479px]:sr-only">My-Deutsch</span>
        </Link>
        <div className="flex items-center">
          <Nav />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
