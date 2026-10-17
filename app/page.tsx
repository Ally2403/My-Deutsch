import Link from "next/link";
import { Page } from "@/components/ui";

export default function Home() {
  return (
    <Page>
      <h1 className="text-3xl font-bold">My-Deutsch</h1>
      <p className="mt-3 text-muted">
        Lee tus libros de alemán escaneados: toca cualquier palabra y ve su
        significado en español. Los sustantivos se colorean según su género:
      </p>
      <p className="mt-4 text-lg font-semibold">
        <span className="text-gender-m">der · masculino</span>
        <br />
        <span className="text-gender-n">das · neutro</span>
        <br />
        <span className="text-gender-f">die · femenino</span>
      </p>
      <p className="mt-4 text-muted">
        Los libros se comparten solo con los miembros de tu curso. Tu
        diccionario y tus respuestas son privados.
      </p>
      <div className="mt-8 flex flex-col gap-3">
        <Link
          href="/login"
          className="flex min-h-11 items-center justify-center rounded-lg bg-accent px-4 font-medium text-background"
        >
          Iniciar sesión
        </Link>
        <Link
          href="/registro"
          className="flex min-h-11 items-center justify-center rounded-lg border border-border px-4 font-medium"
        >
          Crear cuenta
        </Link>
      </div>
      <p className="mt-8 text-sm text-muted">
        <Link href="/privacidad" className="underline">
          Política de privacidad
        </Link>
      </p>
    </Page>
  );
}
