import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "./database.types";

/** Rutas que no exigen sesión (RF-40: inicio y privacidad; /lector/demo es sintético; /lector/local da 404 en producción). */
const PUBLIC_PATHS = ["/", "/privacidad", "/login", "/registro", "/recuperar", "/auth", "/lector/demo", "/lector/local", "/repaso/demo"];

export function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p || (p !== "/" && pathname.startsWith(`${p}/`)));
}

/** Refresca la sesión en cada petición y redirige a /login si la ruta es privada (RN-03); la API responde 401. */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const { data } = await supabase.auth.getClaims();
  const { pathname } = request.nextUrl;

  if (!data?.claims && !isPublicPath(pathname)) {
    // La API responde 401 JSON: un fetch que siguiera la redirección recibiría el HTML de /login.
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
    }
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  return response;
}
