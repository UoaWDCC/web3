import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/services/supabase";
import { RegistrationService } from "@/services/registrations/registrations-service";
import { verifyMessage } from "viem";
import { isAllowedAdminAddress } from "@/lib/admin-auth";
import { normalizeRegistrationUrl } from "@/lib/events";

async function verifyAdminAuth(req: NextRequest) {
  const address = req.headers.get("x-admin-address")?.toLowerCase();
  const signature = req.headers.get("x-admin-signature");
  const timestamp = req.headers.get("x-admin-timestamp");

  if (!address || !signature || !timestamp) return false;
  if (!isAllowedAdminAddress(address)) return false;

  // Prevent replay attacks (valid for 5 mins)
  if (Date.now() - parseInt(timestamp) > 5 * 60 * 1000) return false;

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

// GET - list events
export async function GET(req: NextRequest) {
  const isAuth = await verifyAdminAuth(req);
  if (!isAuth)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .order("start_time", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed" },
      { status: 500 },
    );
  }
}

// PUT - create or update event
export async function PUT(req: NextRequest) {
  const isAuth = await verifyAdminAuth(req);
  if (!isAuth)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const {
      id,
      title,
      description,
      start_time,
      end_time,
      event_path,
      event_url,
      location,
      registration_url,
    } = body || {};

    if (!title || !start_time || !end_time) {
      return NextResponse.json(
        { error: "Missing required fields: title, start_time, end_time" },
        { status: 400 },
      );
    }

    // Basic validation: end_time > start_time
    if (new Date(end_time) <= new Date(start_time)) {
      return NextResponse.json(
        { error: "end_time must be after start_time" },
        { status: 400 },
      );
    }

    let registrationUrl: string | null | undefined;
    if (registration_url !== undefined) {
      try {
        registrationUrl = normalizeRegistrationUrl(registration_url);
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Invalid registration link";
        return NextResponse.json({ error: message }, { status: 400 });
      }
    }

    const supabase = getSupabase();

    if (id) {
      const updatePayload: any = {
        title,
        description,
        start_time,
        end_time,
      };
      if (event_path !== undefined) updatePayload.event_path = event_path;
      if (event_url !== undefined) updatePayload.event_url = event_url;
      if (location !== undefined) updatePayload.location = location;
      if (registrationUrl !== undefined)
        updatePayload.registration_url = registrationUrl;

      const { data, error } = await supabase
        .from("events")
        .update(updatePayload)
        .eq("id", id)
        .select()
        .single();

      if (error)
        return NextResponse.json({ error: error.message }, { status: 500 });

      return NextResponse.json({ event: data });
    }

    // create
    const insertPayload: any = {
      title,
      description,
      start_time,
      end_time,
    };
    if (event_path !== undefined) insertPayload.event_path = event_path;
    if (event_url !== undefined) insertPayload.event_url = event_url;
    if (location !== undefined) insertPayload.location = location;
    if (registrationUrl !== undefined)
      insertPayload.registration_url = registrationUrl;

    const { data, error } = await supabase
      .from("events")
      .insert([insertPayload])
      .select()
      .single();

    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });

    // If the request included assignedEmails, add the event name to each
    // user's `events_attended` list (if that registration exists).
    const assignedEmails: string[] | undefined = body?.assignedEmails;
    if (assignedEmails && Array.isArray(assignedEmails) && data) {
      const eventName = title;
      for (const email of assignedEmails) {
        try {
          await RegistrationService.addEventAttended(email, eventName);
        } catch (e) {
          // ignore individual failures to avoid blocking event creation
          console.warn("Failed to assign event to", email, e);
        }
      }
    }

    return NextResponse.json({ event: data });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed" },
      { status: 500 },
    );
  }
}

// DELETE - delete event by id
export async function DELETE(req: NextRequest) {
  const isAuth = await verifyAdminAuth(req);
  if (!isAuth)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    let id = searchParams.get("id");

    if (!id) {
      // try body
      const body = await req.json().catch(() => null);
      id = body?.id;
    }

    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("events")
      .delete()
      .eq("id", id)
      .select()
      .single();

    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ event: data });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed" },
      { status: 500 },
    );
  }
}
