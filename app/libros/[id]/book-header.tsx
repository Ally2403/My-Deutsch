import Link from "next/link";
import type { ReactNode } from "react";
import { Icon } from "@/components/icons";
import { ThemeToggle } from "@/components/theme-toggle";

/**
 * RF-14, RNF-15: cabecera del libro. Con viewportFit «cover» el enlace de regreso quedaría
 * bajo la muesca, así que se suma el inset superior al padding de 0.25rem. RF-44: lleva el
 * selector de tema, porque el lector no usa la barra común.
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
    <header className="w-full shrink-0 border-b border-border bg-surface px-3 pt-[max(0.25rem,env(safe-area-inset-top))] pb-1">
      <div className="mx-auto flex w-full max-w-5xl items-center gap-1">
        <Link
          href={backHref}
          className="back-link min-h-11"
        >
          <Icon name="left" size={18} />
          Biblioteca
        </Link>
        <h1 className="min-w-0 flex-1 text-ellipsis whitespace-nowrap overflow-hidden text-center font-display text-base font-bold sm:text-lg">
          {title}
        </h1>
        <ThemeToggle />
      </div>
      {children && <div className="mx-auto w-full max-w-5xl">{children}</div>}
    </header>
  );
}
