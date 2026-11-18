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

export async function GET(req: NextRequest) {
  const isAuth = await verifyAdminAuth(req);
  if (!isAuth)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const eventId = new URL(req.url).searchParams.get("eventId");
  if (!eventId)
    return NextResponse.json({ error: "eventId is required" }, { status: 400 });

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("registrations")
      .select("id, email, first_name, last_name, unique_name")
      .contains("events_attended", [eventId])
      .order("first_name", { ascending: true });

    if (error) throw error;

    const attendees = (data || []).map((registration) => ({
      id: registration.id,
      name:
        registration.unique_name?.trim() ||
        [registration.first_name, registration.last_name]
          .filter(Boolean)
          .join(" ")
          .trim() ||
        registration.email,
    }));

    return NextResponse.json(attendees);
  } catch (error: unknown) {
    console.error(error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to load attendees",
      },
      { status: 500 },
    );
  }
}
