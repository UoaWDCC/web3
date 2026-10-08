import "server-only";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

let _supabaseAdmin: SupabaseClient | null = null;

/**
 * Server-only Supabase client using the service role key.
 * Bypasses Row Level Security — never import this from client components.
 */
export function getSupabaseAdmin(): SupabaseClient {
  if (_supabaseAdmin) return _supabaseAdmin;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Missing Supabase environment variables " +
        (supabaseUrl ? "" : "NEXT_PUBLIC_SUPABASE_URL ") +
        (serviceRoleKey ? "" : "SUPABASE_SERVICE_ROLE_KEY"),
    );
  }

  _supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return _supabaseAdmin;
}
