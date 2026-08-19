import { NextRequest, NextResponse } from "next/server";
import { verifyMessage } from "viem";
import { isAllowedAdminAddress } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/services/supabase-admin";

async function verifyAdminAuth(req: NextRequest) {
  const address = req.headers.get("x-admin-address")?.toLowerCase();
  const signature = req.headers.get("x-admin-signature");
  const timestamp = req.headers.get("x-admin-timestamp");

  if (!address || !signature || !timestamp || !isAllowedAdminAddress(address))
    return false;
  // Longer window than other admin routes (5 min) since this gets reused
  // across a whole door-scanning session instead of a single one-off action.
  if (Date.now() - parseInt(timestamp) > 4 * 60 * 60 * 1000) return false;

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

// Takes a scanned member QR (their public_profiles.qr_secret) plus the event
// being checked into, and appends that event to registrations.events_attended
// if it isn't already there.
export async function POST(req: NextRequest) {
  const isAuth = await verifyAdminAuth(req);
  if (!isAuth)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { qrSecret, eventId } = await req.json();

    if (!qrSecret || !eventId) {
      return NextResponse.json(
        { error: "qrSecret and eventId are required" },
        { status: 400 },
      );
    }

    const supabase = getSupabaseAdmin();

    const { data: profile, error: profileError } = await supabase
      .from("public_profiles")
      .select("id, registration_id")
      .eq("qr_secret", qrSecret)
      .maybeSingle();

    if (profileError) throw profileError;
    if (!profile) {
      return NextResponse.json(
        { error: "QR code not recognized" },
        { status: 404 },
      );
    }

    const { data: registration, error: registrationError } = await supabase
      .from("registrations")
      .select("id, email, first_name, last_name, unique_name, events_attended")
      .eq("id", profile.registration_id)
      .single();

    if (registrationError || !registration) {
      return NextResponse.json(
        { error: "Registration not found for this QR code" },
        { status: 404 },
      );
    }

    const memberName =
      registration.unique_name?.trim() ||
      [registration.first_name, registration.last_name]
        .filter(Boolean)
        .join(" ")
        .trim() ||
      registration.email;

    const currentEventsAttended: string[] = registration.events_attended || [];

    if (currentEventsAttended.includes(eventId)) {
      console.log("[admin-checkin] scan success", {
        eventId,
        memberName,
        alreadyCheckedIn: true,
        scannedAt: new Date().toISOString(),
      });

      return NextResponse.json({
        success: true,
        alreadyCheckedIn: true,
        member: { name: memberName },
      });
    }

    const { error: updateError } = await supabase
      .from("registrations")
      .update({ events_attended: [...currentEventsAttended, eventId] })
      .eq("id", registration.id);

    if (updateError) throw updateError;

    console.log("[admin-checkin] scan success", {
        eventId,
        memberName,
        alreadyCheckedIn: true,
        scannedAt: new Date().toISOString(),
      });

    

    return NextResponse.json({
      success: true,
      alreadyCheckedIn: false,
      member: { name: memberName },
    });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json(
      { error: error.message || "Failed to verify check-in" },
      { status: 500 },
    );
  }
}
