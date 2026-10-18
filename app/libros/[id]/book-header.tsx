import Link from "next/link";
import type { ReactNode } from "react";

/**
 * RF-14, RNF-15: cabecera del libro. Con viewportFit «cover» (PWA en iPhone) el enlace de
 * regreso quedaría bajo la muesca, así que se suma el inset superior al padding de 0.5rem.
 */
export function BookHeader({
  backHref,
  title,
  children,
}: {
  backHref: string;
  title: string;
  children?: ReactNode;
}) {
  return (
    <header className="mx-auto w-full max-w-md shrink-0 px-4 pt-[max(0.5rem,env(safe-area-inset-top))]">
      <p className="text-sm">
        <Link
          href={backHref}
          className="inline-flex min-h-11 items-center underline"
        >
          ← Biblioteca
        </Link>
      </p>
      <h1 className="truncate text-xl font-bold">{title}</h1>
      {children}
    </header>
  );
}
