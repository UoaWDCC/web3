import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/services/supabase";
import { RegistrationService } from "@/services/registrations/registrations-service";
import { verifyMessage } from "viem";
import { z } from "zod";
import { isAllowedAdminAddress } from "@/lib/admin-auth";
import type { ClubEvent } from "@/lib/events";
import { eventBadgeSchema } from "@/lib/schemas/badge";
import { EventService } from "@/services/event-service";
import { getSupabaseAdmin } from "@/services/supabase-admin";

async function verifyAdminAuth(req: NextRequest) {
  const address = req.headers.get("x-admin-address")?.toLowerCase();
  const signature = req.headers.get("x-admin-signature");
  const timestamp = req.headers.get("x-admin-timestamp");

  if (!address || !signature || !timestamp) return false;
  if (!isAllowedAdminAddress(address)) return false;
  if (Date.now() - parseInt(timestamp) > 5 * 60 * 1000) return false;

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

// Postgres errors caused by the request's data rather than the server: bad
// parameter, invalid text/datetime representation, datetime out of range,
// not-null, foreign key, unique and check violations.
const CLIENT_ERROR_CODES = new Set([
  "22023",
  "22P02",
  "22007",
  "22008",
  "23502",
  "23503",
  "23505",
  "23514",
]);

class BadRequestError extends Error {}

/** Returns the named form field as an image file, or null if it's absent. */
function imageField(formData: FormData, name: string): File | null {
  const value = formData.get(name);
  if (value === null || value === "") return null;

  if (!(value instanceof File) || !value.type.startsWith("image/")) {
    throw new BadRequestError(`${name} must be an image file`);
  }
  return value;
}

/**
 * Reads the request in either of the two shapes it may take:
 *
 * - multipart/form-data: a `payload` field holding JSON
 *   `{ event, badge?, remove_badge?, assignedEmails? }`, plus optional
 *   `event_image` and `badge_image` files. Used by the admin event form.
 * - JSON: the flat event fields plus `assignedEmails`, as sent before badges
 *   existed. It has no badge or image upload support.
 */
async function readSaveRequest(req: NextRequest) {
  const contentType = req.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    const formData = await req.formData();
    const payload = formData.get("payload");

    if (typeof payload !== "string") {
      throw new BadRequestError("Missing payload field");
    }

    let body: unknown;
    try {
      body = JSON.parse(payload);
    } catch {
      throw new BadRequestError("payload must be valid JSON");
    }

    if (!body || typeof body !== "object") {
      throw new BadRequestError("payload must be a JSON object");
    }

    const { event, badge, remove_badge, assignedEmails } = body as Record<
      string,
      unknown
    >;

    return {
      event,
      badge,
      removeBadge: remove_badge === true,
      assignedEmails,
      eventImage: imageField(formData, "event_image"),
      badgeImage: imageField(formData, "badge_image"),
    };
  }

  const json = await req.json().catch(() => null);
  if (!json || typeof json !== "object") {
    throw new BadRequestError("Request body must be a JSON object");
  }

  const { assignedEmails, ...event } = json as Record<string, unknown>;
  return {
    event,
    badge: null,
    removeBadge: false,
    assignedEmails,
    eventImage: null,
    badgeImage: null,
  };
}

// PUT - create or update an event, and optionally its badge, all or nothing
export async function PUT(req: NextRequest) {
  const isAuth = await verifyAdminAuth(req);
  if (!isAuth)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const request = await readSaveRequest(req);
    const {
      id,
      title,
      description,
      start_time,
      end_time,
      check_in_open_time,
      check_in_close_time,
      event_path,
      event_url,
      location,
      capacity,
    } = (request.event || {}) as Partial<ClubEvent>;

    if (!title || !start_time || !end_time) {
      throw new BadRequestError(
        "Missing required fields: title, start_time, end_time",
      );
    }

    // Basic validation: end_time > start_time
    if (new Date(end_time) <= new Date(start_time)) {
      throw new BadRequestError("end_time must be after start_time");
    }

    if (check_in_open_time && check_in_close_time) {
      if (new Date(check_in_close_time) <= new Date(check_in_open_time)) {
        throw new BadRequestError(
          "check_in_close_time must be after check_in_open_time",
        );
      }
    }

    // category, eventid and imageurl are stripped here: the database function
    // sets the first two, and imageurl only ever comes from badge_image.
    const badge =
      request.badge == null ? null : eventBadgeSchema.parse(request.badge);

    if (badge && request.removeBadge) {
      throw new BadRequestError(
        "Cannot save a badge and remove it in the same request",
      );
    }

    if (request.badgeImage && !badge) {
      throw new BadRequestError("badge_image was sent without a badge");
    }

    const saved = await EventService.saveEventWithBadge(getSupabaseAdmin(), {
      // An update leaves out the columns that are undefined here, so they keep
      // their current values.
      event: {
        id,
        title,
        description,
        start_time,
        end_time,
        check_in_open_time,
        check_in_close_time,
        event_path,
        event_url,
        location,
        capacity,
      },
      badge,
      removeBadge: request.removeBadge,
      eventImage: request.eventImage,
      badgeImage: request.badgeImage,
    });

    // On create, add the event name to each assigned user's `events_attended`
    // list (if that registration exists).
    const assignedEmails = request.assignedEmails;
    if (!id && assignedEmails && Array.isArray(assignedEmails)) {
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

    return NextResponse.json(saved);
  } catch (err: unknown) {
    if (err instanceof BadRequestError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }

    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: err.issues.map((issue) => issue.message).join("; ") },
        { status: 400 },
      );
    }

    const code = (err as { code?: string } | null)?.code;
    const message =
      (err as { message?: string } | null)?.message || "Failed to save event";

    const status =
      code === "P0002"
        ? 404
        : code && CLIENT_ERROR_CODES.has(code)
          ? 400
          : 500;

    return NextResponse.json({ error: message }, { status });
  }
}

// DELETE - delete event by id, along with its badge (ON DELETE CASCADE), every
// member's award of that badge, and both image files.
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

    const event = await EventService.deleteEvent(getSupabaseAdmin(), id);

    return NextResponse.json({ event });
  } catch (err: unknown) {
    const code = (err as { code?: string } | null)?.code;
    const message =
      (err as { message?: string } | null)?.message || "Failed to delete event";

    // PGRST116: .single() matched no row, i.e. there is no event with that id.
    // 22P02: the id isn't a valid uuid.
    const status = code === "PGRST116" ? 404 : code === "22P02" ? 400 : 500;

    return NextResponse.json({ error: message }, { status });
  }
}
