import Link from "next/link";
import { GenderDemo } from "@/components/gender-demo";
import { Page } from "@/components/ui";

export default function Home() {
  return (
    <Page>
      <h1 className="font-display text-4xl font-extrabold leading-tight">
        Lee en alemán sin cerrar el libro
      </h1>
      <p className="mt-3 text-lg text-muted">
        Sube las páginas escaneadas de tu curso, toca cualquier palabra y ve su
        significado en español. Cada sustantivo muestra su género:{" "}
        <span className="font-semibold text-gender-m">der</span>,{" "}
        <span className="font-semibold text-gender-n">das</span> y{" "}
        <span className="font-semibold text-gender-f">die</span>.
      </p>
      <div className="mt-6">
        <GenderDemo />
      </div>
      <div className="mt-8 flex flex-col gap-3">
        <Link
          href="/registro"
          className="pressable flex min-h-12 items-center justify-center rounded-control bg-accent px-5 font-semibold text-on-accent shadow-card"
        >
          Crear cuenta
        </Link>
        <Link
          href="/login"
          className="pressable flex min-h-12 items-center justify-center rounded-control border border-border bg-surface px-5 font-semibold"
        >
          Ya tengo cuenta
        </Link>
      </div>
      <p className="mt-6 text-sm text-muted">
        Los libros se comparten solo con tu curso; tu diccionario y tus
        respuestas son privados.
      </p>
      <p className="mt-6 text-sm text-muted">
        <Link href="/privacidad" className="inline-flex min-h-11 items-center underline">
          Política de privacidad
        </Link>
      </p>
    </Page>
  );
}
