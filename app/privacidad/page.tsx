import Link from "next/link";
import { Page } from "@/components/ui";

export const metadata = { title: "Política de privacidad · My-Deutsch" };

// Correo de contacto público: se configura en Vercel (NEXT_PUBLIC_CONTACT_EMAIL), no se guarda en el repositorio.
const contact = process.env.NEXT_PUBLIC_CONTACT_EMAIL;

export default function Privacidad() {
  return (
    <Page>
      <h1 className="text-2xl font-bold">Política de privacidad</h1>
      <p className="mt-2 text-sm text-muted">
        Última actualización: 17 de octubre de 2026
      </p>

      <h2 className="mt-6 text-lg font-semibold">Qué datos guardamos</h2>
      <ul className="mt-2 list-disc space-y-1 pl-5">
        <li>
          Tu correo, tu nombre y tu foto de perfil (si entras con Google).
        </li>
        <li>Los grupos a los que perteneces y los libros que subes a ellos.</li>
        <li>
          Tu progreso de lectura, tu diccionario personal y las respuestas que
          escribes sobre las páginas.
        </li>
      </ul>

      <h2 className="mt-6 text-lg font-semibold">Quién puede verlos</h2>
      <ul className="mt-2 list-disc space-y-1 pl-5">
        <li>
          Los libros solo los ven los miembros de los grupos a los que se
          vinculan. No hay libros públicos.
        </li>
        <li>
          Tu progreso, tu diccionario personal y tus respuestas son privados:
          nadie más puede verlos, tampoco el administrador del grupo.
        </li>
        <li>Los miembros de tus grupos ven tu nombre y tu foto.</li>
      </ul>

      <h2 className="mt-6 text-lg font-semibold">Qué no hacemos</h2>
      <p className="mt-2">
        No vendemos ni compartimos tus datos y no mostramos publicidad. De
        Google solo recibimos tu correo, tu nombre y tu foto de perfil.
      </p>

      <h2 className="mt-6 text-lg font-semibold">Eliminación de tus datos</h2>
      <p className="mt-2">
        Puedes pedir que borremos tu cuenta y todos tus datos escribiendo a{" "}
        {contact ? (
          <a className="tap-link underline" href={`mailto:${contact}`}>
            {contact}
          </a>
        ) : (
          "la persona que administra tu curso"
        )}
        .
      </p>

      <p className="mt-8">
        <Link href="/" className="tap-link underline">
          Volver al inicio
        </Link>
      </p>
    </Page>
  );
}
