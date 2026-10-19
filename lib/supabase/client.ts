import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./database.types";

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      // Solo el servidor (proxy) renueva la sesión en segundo plano. Si el navegador también lo
      // hiciera, dos renovaciones con el mismo token de refresco competirían y una fallaría con
      // «refresh_token_not_found», cerrando la sesión. Al hacer una consulta con el token vencido
      // el cliente sigue renovándolo en el momento.
      auth: { autoRefreshToken: false },
    },
  );
}
