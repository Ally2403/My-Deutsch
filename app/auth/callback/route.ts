import { NextResponse, type NextRequest } from "next/server";
import { safeNext } from "@/lib/domain/redirect";
import { createClient } from "@/lib/supabase/server";

// Destino de Google y de los enlaces del correo (verificación y recuperación).
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = safeNext(searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  }
  return NextResponse.redirect(`${origin}/login?error=enlace`);
}
