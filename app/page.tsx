import Link from "next/link";
import { GenderDemo } from "@/components/gender-demo";
import { Page } from "@/components/ui";

const STEPS = [
  {
    n: "1",
    title: "Sube tu libro",
    text: "El PDF escaneado de tu curso, compartido solo con tu grupo.",
  },
  {
    n: "2",
    title: "Toca una palabra",
    text: "Ve su significado en español, sin salir de la página.",
  },
  {
    n: "3",
    title: "Aprende con colores",
    text: "Cada sustantivo muestra su género y se guarda en tu diccionario.",
  },
] as const;

export default function Home() {
  return (
    <Page width="wide">
      <div className="grid items-center gap-10 md:grid-cols-2 md:gap-14 md:py-8">
        <div>
          <p className="inline-flex rounded-full bg-accent-soft px-3 py-1 text-sm font-semibold text-accent">
            Alemán B1 → C1
          </p>
          <h1 className="mt-4 font-display text-4xl font-extrabold leading-[1.1] sm:text-5xl">
            Lee en alemán sin cerrar el libro
          </h1>
          <p className="mt-4 text-lg text-muted">
            Sube las páginas escaneadas de tu curso, toca cualquier palabra y ve
            su significado en español. Cada sustantivo muestra su género:{" "}
            <span className="font-semibold text-gender-m">der</span>,{" "}
            <span className="font-semibold text-gender-n">das</span> y{" "}
            <span className="font-semibold text-gender-f">die</span>.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/registro"
              className="pressable flex min-h-12 items-center justify-center rounded-control bg-accent px-6 font-semibold text-on-accent shadow-card"
            >
              Crear cuenta
            </Link>
            <Link
              href="/login"
              className="pressable flex min-h-12 items-center justify-center rounded-control border border-border bg-surface px-6 font-semibold"
            >
              Ya tengo cuenta
            </Link>
          </div>
        </div>
        <GenderDemo />
      </div>

      <ol className="mt-14 grid gap-4 md:grid-cols-3">
        {STEPS.map((s) => (
          <li key={s.n} className="card p-5">
            <span
              aria-hidden="true"
              className="flex size-8 items-center justify-center rounded-full bg-accent-soft font-display text-sm font-bold text-accent"
            >
              {s.n}
            </span>
            <h2 className="mt-3 font-display text-lg font-bold">{s.title}</h2>
            <p className="mt-1 text-muted">{s.text}</p>
          </li>
        ))}
      </ol>

      <p className="mt-10 text-center text-sm text-muted">
        Los libros se comparten solo con tu curso; tu diccionario y tus
        respuestas son privados.
        <br />
        <Link
          href="/privacidad"
          className="inline-flex min-h-11 items-center underline"
        >
          Política de privacidad
        </Link>
      </p>
    </Page>
  );
}
