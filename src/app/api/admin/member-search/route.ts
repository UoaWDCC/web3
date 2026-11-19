import { NextRequest, NextResponse } from "next/server";
import { verifyMessage } from "viem";
import { isAdminAddress } from "@/lib/admin-auth-server";
import { getSupabaseAdmin } from "@/services/supabase-admin";

async function verifyAdminAuth(req: NextRequest) {
  const address = req.headers.get("x-admin-address")?.toLowerCase();
  const signature = req.headers.get("x-admin-signature");
  const timestamp = req.headers.get("x-admin-timestamp");

  if (!address || !signature || !timestamp) return false;
  if (!(await isAdminAddress(address))) return false;

  // Prevent replay attacks (valid for 5 mins)
  if (Date.now() - parseInt(timestamp) > 5 * 60 * 1000) return false;

  try {
    return await verifyMessage({
      address: address as `0x${string}`,
      message: `Admin Auth ${timestamp}`,
      signature: signature as `0x${string}`,
    });
  } catch {
    return false;
  }
}

// Search members by name so an admin can pick one instead of pasting a
// wallet address. Uses the same RPC as the public profile search, then
// resolves each match to its full wallet address — which the public search
// deliberately withholds (it returns only wallet_suffix).
export async function GET(req: NextRequest) {
  const isAuth = await verifyAdminAuth(req);
  if (!isAuth)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const query = req.nextUrl.searchParams.get("q")?.trim().replace(/\s+/g, " ");
  if (!query || query.length < 2) {
    return NextResponse.json({ members: [] });
  }

  const supabase = getSupabaseAdmin();

  const { data: matches, error } = await supabase.rpc("search_public_profiles", {
    search_query: query.slice(0, 64),
    max_results: 8,
    excluded_wallet: null,
  });

  if (error) {
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }

  const profileIds = (matches ?? []).map((m: { id: string }) => m.id);
  if (!profileIds.length) return NextResponse.json({ members: [] });

  const { data: profiles } = await supabase
    .from("public_profiles")
    .select("id, registration_id")
    .in("id", profileIds);

  const registrationIds = (profiles ?? []).map((p) => p.registration_id);

  const { data: registrations } = await supabase
    .from("registrations")
    .select("id, wallet_id")
    .in("id", registrationIds);

  const walletByRegistration = new Map(
    (registrations ?? []).map((r) => [r.id, r.wallet_id]),
  );
  const registrationByProfile = new Map(
    (profiles ?? []).map((p) => [p.id, p.registration_id]),
  );

  const members = (matches ?? [])
    .map(
      (match: {
        id: string;
        display_name: string;
        unique_name: string | null;
        profile_picture_url: string | null;
      }) => {
        const registrationId = registrationByProfile.get(match.id);
        const walletAddress = registrationId
          ? walletByRegistration.get(registrationId)
          : null;

        return {
          id: match.id,
          display_name: match.display_name,
          unique_name: match.unique_name,
          profile_picture_url: match.profile_picture_url,
          wallet_address: walletAddress ?? null,
        };
      },
    )
    // A member with no wallet on file cannot be made an admin.
    .filter((member: { wallet_address: string | null }) => member.wallet_address);

  return NextResponse.json({ members });
}
