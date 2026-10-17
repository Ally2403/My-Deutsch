import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// RF-04: cerrar sesión (solo POST, para que un enlace externo no pueda cerrarla).
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/login", request.url), { status: 303 });
}
