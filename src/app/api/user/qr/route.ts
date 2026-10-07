import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { verifyWalletAuth } from "@/lib/wallet-auth";
import { getSupabaseAdmin } from "@/services/supabase-admin";

type Registration = {
  id: number;
};

type QrCredential = {
  registration_id: number;
  qr_secret: string;
};

async function resolveRegistrationByWallet(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  walletAddress: string,
): Promise<Registration> {
  const { data: registration, error: registrationError } = await supabase
    .from("registrations")
    .select("id")
    .ilike("wallet_id", walletAddress)
    .single();

  if (registrationError || !registration) {
    throw new Error(`No registration found for wallet ${walletAddress}`);
  }

  return registration as Registration;
}

// Returns the caller's personal check-in QR payload, generating and storing
// one on first request. The credential is deliberately independent from the
// public profile row, which is removed whenever a member hides their profile.
export async function GET(req: NextRequest) {
  const walletAddress = await verifyWalletAuth(req);
  if (!walletAddress)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const supabase = getSupabaseAdmin();
    const registration = await resolveRegistrationByWallet(
      supabase,
      walletAddress,
    );
    const { data: existingCredential, error: credentialError } = await supabase
      .from("profile_qr_credentials")
      .select("registration_id, qr_secret")
      .eq("registration_id", registration.id)
      .maybeSingle();

    if (credentialError) {
      throw credentialError;
    }

    if (existingCredential) {
      const credential = existingCredential as QrCredential;
      return NextResponse.json({ qrPayload: credential.qr_secret });
    }

    const qrSecret = randomBytes(32).toString("base64url");
    const { error: insertError } = await supabase
      .from("profile_qr_credentials")
      .insert({
        registration_id: registration.id,
        qr_secret: qrSecret,
      });

    if (!insertError) {
      return NextResponse.json({ qrPayload: qrSecret });
    }

    // Another concurrent request may have created the credential first. Read
    // the winning value so both requests return a QR that remains valid.
    if (insertError.code === "23505") {
      const { data: concurrentCredential, error: concurrentReadError } =
        await supabase
          .from("profile_qr_credentials")
          .select("registration_id, qr_secret")
          .eq("registration_id", registration.id)
          .single();

      if (!concurrentReadError && concurrentCredential) {
        const credential = concurrentCredential as QrCredential;
        return NextResponse.json({ qrPayload: credential.qr_secret });
      }
    }

    throw insertError;
  } catch (error: unknown) {
    console.error(error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to issue check-in QR",
      },
      { status: 500 },
    );
  }
}
