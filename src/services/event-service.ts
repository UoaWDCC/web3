import { getSupabase } from "./supabase";
import type { ClubEvent } from "../lib/events";

const EVENT_IMAGE_BUCKET = "events";
const EVENT_IMAGE_FOLDER = "events";

export type AttendedEvent = {
  id: string;
  title: string;
  eventUrl: string | null;
};

export type AttendedEventResolution = {
  events: AttendedEvent[];
  unavailableCount: number;
};

type EventLookupRow = Pick<ClubEvent, "id" | "title" | "event_url">;

const normalizeAttendanceReference = (reference: string) =>
  reference.trim().toLowerCase();

export function resolveAttendedEvents(
  attendanceReferences: string[],
  eventRows: EventLookupRow[],
): AttendedEventResolution {
  const uniqueReferences = Array.from(
    new Set(
      attendanceReferences.map((reference) => reference.trim()).filter(Boolean),
    ),
  );
  const eventsByReference = new Map<string, EventLookupRow>();

  for (const event of eventRows) {
    eventsByReference.set(normalizeAttendanceReference(event.id), event);

    if (event.title) {
      eventsByReference.set(normalizeAttendanceReference(event.title), event);
    }
  }

  const events: AttendedEvent[] = [];
  let unavailableCount = 0;

  for (const reference of uniqueReferences) {
    const event = eventsByReference.get(normalizeAttendanceReference(reference));

    if (!event) {
      unavailableCount += 1;
      continue;
    }

    events.push({
      id: event.id,
      title: event.title?.trim() || "Untitled event",
      eventUrl: event.event_url,
    });
  }

  return { events, unavailableCount };
}

export const EventService = {
  /** Public read used by the events page. Relies on anon SELECT being allowed. */
  listEvents: async (): Promise<ClubEvent[]> => {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .order("start_time", { ascending: true });

    if (error) {
      throw error;
    }

    return (data ?? []) as ClubEvent[];
  },

  getEventById: async (id: string): Promise<ClubEvent | null> => {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return (data as ClubEvent | null) ?? null;
  },

  /**
   * Resolves attendance values written by both generations of the check-in
   * flow: current UUIDs and legacy event titles. The small projection keeps
   * member profiles consistent without exposing raw attendance identifiers.
   */
  getAttendedEvents: async (
    attendanceReferences: string[],
  ): Promise<AttendedEventResolution> => {
    if (attendanceReferences.length === 0) {
      return { events: [], unavailableCount: 0 };
    }

    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("events")
      .select("id,title,event_url");

    if (error) {
      throw error;
    }

    return resolveAttendedEvents(
      attendanceReferences,
      (data ?? []) as EventLookupRow[],
    );
  },

  getEventImagePath: (file: File) => {
    const fileExtension = file.name.split(".").pop()?.toLowerCase();
    if (!fileExtension) {
      throw new Error("Event image must have a file extension.");
    }

    return `${EVENT_IMAGE_FOLDER}/${crypto.randomUUID()}.${fileExtension}`;
  },

  uploadEventImage: async (file: File) => {
    const supabase = getSupabase();
    const imagePath = EventService.getEventImagePath(file);

    const { error } = await supabase.storage
      .from(EVENT_IMAGE_BUCKET)
      .upload(imagePath, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type,
      });

    if (error) {
      throw error;
    }

    const { data } = supabase.storage
      .from(EVENT_IMAGE_BUCKET)
      .getPublicUrl(imagePath);

    return {
      imagePath,
      imageUrl: data.publicUrl,
    };
  },
};
