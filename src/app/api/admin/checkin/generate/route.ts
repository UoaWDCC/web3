import { NextRequest, NextResponse } from "next/server";
import { randomBytes, createHash } from "crypto";
import { verifyMessage } from "viem";
import { isAllowedAdminAddress } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/services/supabase-admin";

const TOKEN_TTL_MS = 2 * 60 * 1000; // 2 minutes
const SHORT_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I

async function verifyAdminAuth(req: NextRequest) {
  const address = req.headers.get("x-admin-address")?.toLowerCase();
  const signature = req.headers.get("x-admin-signature");
  const timestamp = req.headers.get("x-admin-timestamp");

  if (!address || !signature || !timestamp || !isAllowedAdminAddress(address))
    return null;
  if (Date.now() - parseInt(timestamp) > 5 * 60 * 1000) return null;

  try {
    const ok = await verifyMessage({
      address: address as `0x${string}`,
      message: `Admin Auth ${timestamp}`,
      signature: signature as `0x${string}`,
    });
    return ok ? address : null;
  } catch {
    return null;
  }
}

function generateShortCode(length = 8): string {
  const bytes = randomBytes(length);
  let code = "";
  for (let i = 0; i < length; i++) {
    code += SHORT_CODE_CHARS[bytes[i] % SHORT_CODE_CHARS.length];
  }
  return code;
}

function hashToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}

async function resolveAdminProfileId(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  walletAddress: string,
): Promise<string> {
  const { data: registration, error: registrationError } = await supabase
    .from("registrations")
    .select("id")
    .ilike("wallet_id", walletAddress)
    .single();

  if (registrationError || !registration) {
    throw new Error(
      `No registration found for admin wallet ${walletAddress}`,
    );
  }

  const { data: profile, error: profileError } = await supabase
    .from("public_profiles")
    .select("id")
    .eq("registration_id", registration.id)
    .single();

  if (profileError || !profile) {
    throw new Error(
      `No public_profiles row found for admin wallet ${walletAddress}`,
    );
  }

  return profile.id;
}

export async function POST(req: NextRequest) {
  const adminAddress = await verifyAdminAuth(req);
  if (!adminAddress)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { eventId } = await req.json();
    if (!eventId) {
      return NextResponse.json(
        { error: "eventId is required" },
        { status: 400 },
      );
    }

    const supabase = getSupabaseAdmin();
    const adminProfileId = await resolveAdminProfileId(supabase, adminAddress);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + TOKEN_TTL_MS);

    const rawToken = randomBytes(32).toString("base64url");
    const tokenHash = hashToken(rawToken);
    const shortCode = generateShortCode();

    // Revoke any non-revoked token for this event (expired or not) before
    // issuing a new one — the DB's one_active_token_per_event constraint
    // treats "active" as revoked_at IS NULL, not "still time-valid".
    const { error: revokeError } = await supabase
      .from("check_in_tokens")
      .update({ revoked_at: now.toISOString(), revoked_by: adminProfileId })
      .eq("event_id", eventId)
      .is("revoked_at", null);

    if (revokeError) {
      console.error("Failed to revoke prior token:", revokeError);
      throw revokeError;
    }

    const { data, error } = await supabase
      .from("check_in_tokens")
      .insert({
        event_id: eventId,
        token_hash: tokenHash,
        short_code: shortCode,
        issued_by: adminProfileId,
        issued_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
      })
      .select("id, expires_at")
      .single();

    if (error) throw error;

    return NextResponse.json({
      token: rawToken,
      shortCode,
      expiresAt: data.expires_at,
    });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json(
      { error: error.message || "Failed to generate check-in token" },
      { status: 500 },
    );
  }
}
