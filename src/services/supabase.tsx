import { createClient } from "@supabase/supabase-js";

/**
 * Creates and exports a Supabase client instance.
 * The URL and anonymous key are fetched from environment variables.
 * Throws an error if either variable is missing.
 *
 * @see https://supabase.com/docs/client/imports
 */
export const supabase = (() => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Missing Supabase environment variables " +
        (supabaseUrl ? "" : "NEXT_PUBLIC_SUPABASE_URL") +
        (supabaseAnonKey ? "" : "NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    );
  }

  return createClient(supabaseUrl, supabaseAnonKey);
})();
