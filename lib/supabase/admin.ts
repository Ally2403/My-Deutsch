import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

// SOLO servidor (rutas de API): usa la service role key, que nunca llega al cliente (RNF-06).
export function createAdminClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("admin_client_not_configured");
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
