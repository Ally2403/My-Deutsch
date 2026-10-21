import Link from "next/link";
import { GenderDemo } from "@/components/gender-demo";
import { Page } from "@/components/ui";

const STEPS = [
  {
    title: "Sube tu libro",
    text: "El PDF escaneado de tu curso. Se comparte solo con tu grupo.",
  },
  {
    title: "Toca una palabra",
    text: "Ves su significado en español sin salir de la página.",
  },
  {
    title: "Repasa lo que viste",
    text: "Cada palabra consultada entra a tu diccionario y a tus tarjetas de repaso.",
  },
] as const;

export default function Home() {
  return (
    <Page width="wide">
      <section className="grid items-center gap-10 md:grid-cols-[1.05fr_1fr] md:gap-14 md:py-6">
        <div>
          <h1 className="text-[2.5rem] leading-[1.06] sm:text-[3.5rem] sm:leading-[1.04]">
            Lee tu libro de alemán sin cerrarlo
          </h1>
          <p className="mt-5 max-w-[34rem] text-lg leading-relaxed text-muted">
            Sube las páginas escaneadas de tu curso y toca cualquier palabra
            para ver su significado. Cada sustantivo se marca con su género:{" "}
            <span className="font-semibold text-gender-m">der</span>,{" "}
            <span className="font-semibold text-gender-n">das</span> o{" "}
            <span className="font-semibold text-gender-f">die</span>.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/registro" className="btn btn-primary btn-lg">
              Crear cuenta
            </Link>
            <Link href="/login" className="btn btn-secondary btn-lg">
              Ya tengo cuenta
            </Link>
          </div>
          <p className="mt-4 text-sm text-muted">
            Hecho para cursos de alemán B1 a C1. Funciona en celular, tableta y
            computador.
          </p>
        </div>
        <GenderDemo />
      </section>

      <section
        aria-labelledby="como"
        className="mt-20 border-t border-border pt-8"
      >
        <h2 id="como" className="text-2xl sm:text-3xl">
          Cómo funciona
        </h2>
        <ol className="mt-6 grid gap-8 md:grid-cols-3 md:gap-10">
          {STEPS.map((s, i) => (
            <li key={s.title} className="flex gap-4">
              <span
                aria-hidden="true"
                className="font-display text-4xl font-semibold leading-none text-muted"
              >
                {i + 1}
              </span>
              <div>
                <h3 className="text-lg">{s.title}</h3>
                <p className="mt-1 text-muted">{s.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <footer className="mt-20 flex flex-col gap-1 border-t border-border pt-6 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
        <p>
          Los libros se comparten solo con tu curso. Tu diccionario y tus
          respuestas son privados.
        </p>
        <Link
          href="/privacidad"
          className="inline-flex min-h-11 items-center underline underline-offset-4"
        >
          Política de privacidad
        </Link>
      </footer>
    </Page>
  );
}
