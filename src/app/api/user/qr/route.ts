import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { verifyWalletAuth } from "@/lib/wallet-auth";
import { getSupabaseAdmin } from "@/services/supabase-admin";

async function resolveProfileByWallet(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  walletAddress: string,
) {
  const { data: registration, error: registrationError } = await supabase
    .from("registrations")
    .select("id")
    .ilike("wallet_id", walletAddress)
    .single();

  if (registrationError || !registration) {
    throw new Error(`No registration found for wallet ${walletAddress}`);
  }

  const { data: profile, error: profileError } = await supabase
    .from("public_profiles")
    .select("id, qr_secret")
    .eq("registration_id", registration.id)
    .single();

  if (profileError || !profile) {
    throw new Error(`No public_profiles row found for wallet ${walletAddress}`);
  }

  return profile as { id: string; qr_secret: string | null };
}

// Returns the caller's personal check-in QR payload, generating and storing
// one on first request. Stored as plaintext (not hashed) so it can be
// redisplayed on every subsequent load, and can be individually revoked by
// clearing/regenerating just this row's qr_secret.
export async function GET(req: NextRequest) {
  const walletAddress = await verifyWalletAuth(req);
  if (!walletAddress)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const supabase = getSupabaseAdmin();
    const profile = await resolveProfileByWallet(supabase, walletAddress);

    if (profile.qr_secret) {
      return NextResponse.json({ profileId: profile.id, qrPayload: profile.qr_secret });
    }

    const qrSecret = randomBytes(32).toString("base64url");
    const { error } = await supabase
      .from("public_profiles")
      .update({ qr_secret: qrSecret })
      .eq("id", profile.id);

    if (error) throw error;

    return NextResponse.json({ profileId: profile.id, qrPayload: qrSecret });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json(
      { error: error.message || "Failed to issue check-in QR" },
      { status: 500 },
    );
  }
}
