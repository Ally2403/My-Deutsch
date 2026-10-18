import type { NextRequest } from "next/server";
import { servePage } from "@/lib/server/serve-page";

// RF-14: sin extensión a propósito (proxy.ts excluye .webp/.json del refresco de sesión).
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; n: string }> },
) {
  return servePage(params, { column: "image_path", contentType: "image/webp" });
}
