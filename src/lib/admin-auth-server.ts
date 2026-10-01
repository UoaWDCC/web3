import "server-only";
import { isAddress } from "viem";
import { isAllowedAdminAddress } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/services/supabase-admin";

/**
 * Admin access is granted by either source: the env allowlist (for
 * permanent/founding admins) or an active row in the `admins` table
 * (for admins added at runtime through the admin panel).
 *
 * Server-only: pulls in the service-role Supabase client, so this must
 * never be imported from a client component — use isAllowedAdminAddress
 * from "@/lib/admin-auth" there instead.
 */
export async function isAdminAddress(
  address?: string | null,
): Promise<boolean> {
  // strict:false — a pure format check. Addresses are lowercased before
  // comparison, so EIP-55 checksum validation would only reject valid
  // all-uppercase input.
  if (!isAddress(address ?? "", { strict: false })) return false;
  if (isAllowedAdminAddress(address)) return true;

  const { data } = await getSupabaseAdmin()
    .from("admins")
    .select("id")
    .eq("wallet_address", address!.toLowerCase())
    .is("revoked_at", null)
    .maybeSingle();

  return !!data;
}
