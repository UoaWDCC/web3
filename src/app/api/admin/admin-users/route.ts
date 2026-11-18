import { NextRequest, NextResponse } from "next/server";
import { isAddress, verifyMessage } from "viem";
import { isAdminAddress } from "@/lib/admin-auth-server";
import { getSupabaseAdmin } from "@/services/supabase-admin";

// added_by / revoked_by store a public_profiles.id, not an admins.id —
// resolve the acting admin's wallet to that profile id via
// registrations.wallet_id -> registrations.id -> public_profiles.registration_id.
async function resolveProfileId(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  walletAddress: string,
) {
  const { data: registration } = await supabase
    .from("registrations")
    .select("id")
    .ilike("wallet_id", walletAddress)
    .maybeSingle();

  if (!registration) return null;

  const { data: profile } = await supabase
    .from("public_profiles")
    .select("id")
    .eq("registration_id", registration.id)
    .maybeSingle();

  return profile?.id ?? null;
}

async function verifyAdminAuth(req: NextRequest) {
  const address = req.headers.get("x-admin-address")?.toLowerCase();
  const signature = req.headers.get("x-admin-signature");
  const timestamp = req.headers.get("x-admin-timestamp");

  if (!address || !signature || !timestamp) return false;
  if (!(await isAdminAddress(address))) return false;

  // Prevent replay attacks (valid for 5 mins)
  const now = Date.now();
  if (now - parseInt(timestamp) > 5 * 60 * 1000) return false;

  try {
    const valid = await verifyMessage({
      address: address as `0x${string}`,
      message: `Admin Auth ${timestamp}`,
      signature: signature as `0x${string}`,
    });
    return valid;
  } catch {
    return false;
  }
}

// GET all admin rows (active and revoked) — the page derives the active
// listing and the added/revoked history from the same set.
export async function GET(req: NextRequest) {
  const isAuth = await verifyAdminAuth(req);
  if (!isAuth)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("admins")
    .select()
    .order("added_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      { error: "Failed to fetch admin users" },
      { status: 500 },
    );
  }

  // member_name and added_by_name are plain text columns that nothing
  // populates automatically — the oldest rows had them filled in by hand.
  // Resolve the current names instead, falling back to the stored value for
  // rows whose wallet no longer matches a registration.
  const wallets = Array.from(
    new Set(data.map((a) => a.wallet_address).filter(Boolean)),
  );
  const profileIds = Array.from(
    new Set(
      [...data.map((a) => a.added_by), ...data.map((a) => a.revoked_by)].filter(
        Boolean,
      ),
    ),
  );

  const { data: registrations } = wallets.length
    ? await supabase
        .from("registrations")
        .select("id, wallet_id")
        .in("wallet_id", wallets)
    : { data: [] };

  const registrationIds = (registrations ?? []).map((r) => r.id);

  const { data: profilesByRegistration } = registrationIds.length
    ? await supabase
        .from("public_profiles")
        .select("registration_id, display_name")
        .in("registration_id", registrationIds)
    : { data: [] };

  const { data: profilesById } = profileIds.length
    ? await supabase
        .from("public_profiles")
        .select("id, display_name")
        .in("id", profileIds)
    : { data: [] };

  const registrationIdByWallet = new Map(
    (registrations ?? []).map((r) => [r.wallet_id, r.id]),
  );
  const nameByRegistrationId = new Map(
    (profilesByRegistration ?? []).map((p) => [p.registration_id, p.display_name]),
  );
  const nameByProfileId = new Map(
    (profilesById ?? []).map((p) => [p.id, p.display_name]),
  );

  const nameForWallet = (wallet: string) => {
    const registrationId = registrationIdByWallet.get(wallet);
    return registrationId
      ? (nameByRegistrationId.get(registrationId) ?? null)
      : null;
  };

  const admins = data.map((admin) => ({
    ...admin,
    member_name: nameForWallet(admin.wallet_address) ?? admin.member_name,
    added_by_name:
      (admin.added_by ? nameByProfileId.get(admin.added_by) : null) ??
      admin.added_by_name,
    revoked_by_name: admin.revoked_by
      ? (nameByProfileId.get(admin.revoked_by) ?? null)
      : null,
  }));

  return NextResponse.json({ admins });
}

// Add a new admin by wallet address.
export async function POST(req: NextRequest) {
  const isAuth = await verifyAdminAuth(req);
  if (!isAuth)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { walletAddress } = await req.json();
  if (!isAddress(walletAddress ?? "", { strict: false })) {
    return NextResponse.json(
      { error: "Enter a valid wallet address (0x followed by 40 hex characters)" },
      { status: 400 },
    );
  }

  const wallet = walletAddress.toLowerCase();
  const addedByAddress = req.headers.get("x-admin-address")?.toLowerCase();
  const supabase = getSupabaseAdmin();

  const adderProfileId = addedByAddress
    ? await resolveProfileId(supabase, addedByAddress)
    : null;

  // Reuse an existing row for this wallet instead of inserting a duplicate —
  // otherwise revoking someone by accident and re-adding them leaves two
  // rows for the same wallet (one revoked, one active).
  const { data: existing } = await supabase
    .from("admins")
    .select("id, revoked_at")
    .eq("wallet_address", wallet)
    .order("added_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing && !existing.revoked_at) {
    return NextResponse.json(
      { error: "This wallet is already an admin" },
      { status: 409 },
    );
  }

  const { error } = existing
    ? await supabase
        .from("admins")
        .update({
          revoked_at: null,
          revoked_by: null,
          added_at: new Date().toISOString(),
          added_by: adderProfileId,
        })
        .eq("id", existing.id)
    : await supabase.from("admins").insert({
        wallet_address: wallet,
        added_by: adderProfileId,
      });

  if (error) {
    return NextResponse.json(
      { error: "Failed to add admin" },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}

// Revoke an existing admin by wallet address.
export async function PUT(req: NextRequest) {
  const isAuth = await verifyAdminAuth(req);
  if (!isAuth)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { walletAddress } = await req.json();
  if (typeof walletAddress !== "string" || !walletAddress) {
    return NextResponse.json(
      { error: "Wallet address is required" },
      { status: 400 },
    );
  }

  const revokedByAddress = req.headers.get("x-admin-address")?.toLowerCase();
  const supabase = getSupabaseAdmin();

  const revokerProfileId = revokedByAddress
    ? await resolveProfileId(supabase, revokedByAddress)
    : null;

  // Matched verbatim, not lowercased or format-checked: rows added before
  // the address validation existed can hold arbitrary text, and they still
  // need to be revocable. .eq is exact equality, so there is no wildcard risk.
  const { data, error } = await supabase
    .from("admins")
    .update({
      revoked_at: new Date().toISOString(),
      revoked_by: revokerProfileId,
    })
    .eq("wallet_address", walletAddress)
    .is("revoked_at", null)
    .select("id");

  if (error) {
    return NextResponse.json(
      { error: "Failed to revoke admin" },
      { status: 500 },
    );
  }

  if (!data?.length) {
    return NextResponse.json(
      { error: "No active admin found for that wallet address" },
      { status: 404 },
    );
  }

  return NextResponse.json({ ok: true });
}
