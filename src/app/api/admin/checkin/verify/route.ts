import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { verifyMessage } from "viem";
import { isAllowedAdminAddress } from "@/lib/admin-auth";
import BadgesService from "@/services/badges/badges-service";
import MemberBadgesService from "@/services/member-badges/member-badges-service";
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

// Gives the member the event's badge, if the event has an active one. Runs on
// every scan, not just the first, so members who checked in before the badge
// was added get it the next time they're scanned; awardBadge is idempotent, so
// a member who already holds the badge just keeps it.
//
// A failure is logged rather than failing the request: the check-in itself is
// already saved, and scanning the member again retries the award.
async function awardEventBadge(
  supabase: SupabaseClient,
  eventId: string,
  memberId: number,
): Promise<{ name: string } | null> {
  try {
    const badge = await new BadgesService(supabase).getBadgeByEventId(eventId);
    if (!badge || !badge.isactive) return null;

    await new MemberBadgesService(supabase).awardBadge({
      badgeid: badge.id,
      memberid: memberId,
    });

    return { name: badge.name };
  } catch (error) {
    console.error("[admin-checkin] failed to award event badge", {
      eventId,
      memberId,
      error,
    });
    return null;
  }
}

// Takes a scanned member QR plus the event being checked into, and appends that
// event to registrations.events_attended if it isn't already there, then awards
// the event's badge. QR credentials are kept separately from public profiles so
// private members can still check in.
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

    const { data: credential, error: credentialError } = await supabase
      .from("profile_qr_credentials")
      .select("registration_id")
      .eq("qr_secret", qrSecret)
      .maybeSingle();

    if (credentialError) throw credentialError;
    if (!credential) {
      return NextResponse.json(
        { error: "QR code not recognized" },
        { status: 404 },
      );
    }

    const { data: registration, error: registrationError } = await supabase
      .from("registrations")
      .select("id, email, first_name, last_name, unique_name, events_attended")
      .eq("id", credential.registration_id)
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
      const badge = await awardEventBadge(supabase, eventId, registration.id);

      console.log("[admin-checkin] scan success", {
        eventId,
        memberName,
        alreadyCheckedIn: true,
        badge: badge?.name ?? null,
        scannedAt: new Date().toISOString(),
      });

      return NextResponse.json({
        success: true,
        alreadyCheckedIn: true,
        member: { name: memberName },
        badge,
      });
    }

    const { error: updateError } = await supabase
      .from("registrations")
      .update({ events_attended: [...currentEventsAttended, eventId] })
      .eq("id", registration.id);

    if (updateError) throw updateError;

    const badge = await awardEventBadge(supabase, eventId, registration.id);

    console.log("[admin-checkin] scan success", {
      eventId,
      memberName,
      alreadyCheckedIn: false,
      badge: badge?.name ?? null,
      scannedAt: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      alreadyCheckedIn: false,
      member: { name: memberName },
      badge,
    });
  } catch (error: unknown) {
    console.error(error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to verify check-in",
      },
      { status: 500 },
    );
  }
}
