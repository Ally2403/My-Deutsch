"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ThemeToggle } from "@/components/theme-toggle";
import { nextStudyDayStart } from "@/lib/domain/review-queue";
import { syncPrefsOnce } from "@/lib/prefs/client";
import { createClient } from "@/lib/supabase/client";

const LINKS = [
  { href: "/grupos", label: "Grupos" },
  { href: "/diccionario", label: "Diccionario" },
  { href: "/repaso", label: "Repaso" },
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

/** RF-48 c2: tarjetas vencidas (hasta el próximo día de estudio, hora local). Solo con sesión. */
function useDueCount(signedIn: boolean) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!signedIn) return;
    let cancelled = false;
    void createClient()
      .from("card_state")
      .select("lexicon_id", { count: "exact", head: true })
      .lt("due", nextStudyDayStart(new Date()).toISOString())
      .then(({ count: n, error }) => {
        if (!cancelled && !error) setCount(n ?? 0);
      });
    return () => {
      cancelled = true;
    };
  }, [signedIn]);
  return count;
}

function Nav() {
  const pathname = usePathname() ?? "";
  const signedIn = useSignedIn();
  const due = useDueCount(signedIn);
  if (!signedIn) return null;
  return (
    <nav
      aria-label="Principal"
      className="order-3 flex w-full items-center justify-between border-t border-border sm:order-none sm:ml-auto sm:w-auto sm:justify-end sm:border-t-0"
    >
      {LINKS.map((l) => {
        const active = pathname === l.href || pathname.startsWith(`${l.href}/`);
        return (
          <Link
            key={l.href}
            href={l.href}
            prefetch={false}
            aria-current={active ? "page" : undefined}
            className={`relative inline-flex min-h-11 items-center px-2.5 text-sm font-medium transition-colors after:absolute after:inset-x-2.5 after:bottom-0 after:h-0.5 after:rounded-full sm:px-3.5 sm:text-[0.9375rem] ${
              active
                ? "text-foreground after:bg-foreground"
                : "text-muted hover:text-foreground after:bg-transparent"
            }`}
          >
            {l.label}
            {l.href === "/repaso" && due > 0 && (
              <span
                data-testid="due-badge"
                className="ml-1.5 rounded-full bg-foreground px-1.5 text-xs font-semibold tabular-nums text-background"
              >
                {due > 99 ? "99+" : due}
                <span className="sr-only"> vencidas</span>
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

/** RF-44: barra superior común: marca, navegación (solo con sesión) y selector de tema. */
export function AppBar() {
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-x-2 px-3 sm:px-6">
        <Link
          href="/"
          className="inline-flex min-h-11 min-w-11 items-center gap-2.5 font-display text-xl font-semibold tracking-tight"
        >
          <span aria-hidden="true" className="flex h-5 items-end gap-[3px]">
            <span className="h-5 w-[5px] rounded-[1px] bg-gender-m" />
            <span className="h-3.5 w-[5px] rounded-[1px] bg-gender-n" />
            <span className="h-[1.125rem] w-[5px] rounded-[1px] bg-gender-f" />
          </span>
          <span className="max-[479px]:sr-only">My-Deutsch</span>
        </Link>
        <Nav />
        <ThemeToggle />
      </div>
    </header>
  );
}
