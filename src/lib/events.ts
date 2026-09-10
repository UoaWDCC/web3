/**
 * Shared shape and display logic for events stored in the Supabase `events` table.
 */

export type ClubEvent = {
  id: string;
  title: string | null;
  description: string | null;
  start_time: string | null;
  end_time: string | null;
  location: string | null;
  capacity: number | null;
  event_url: string | null;
  event_path: string | null;
  // Used by the admin check-in flow; not surfaced on the public events page.
  check_in_open_time?: string | null;
  check_in_close_time?: string | null;
};

export type EventStatus = "open" | "full" | "closed";

/** The moment an event is considered over. Falls back to start when there is no end. */
const getEventEnd = (event: ClubEvent) => {
  const end = event.end_time ?? event.start_time;
  return end ? new Date(end).getTime() : null;
};

export function isPastEvent(event: ClubEvent, now = Date.now()) {
  const end = getEventEnd(event);
  // Events with no dates at all are treated as upcoming so they stay visible.
  return end !== null && end < now;
}

/**
 * The single place event status is decided.
 *
 * `registeredCount` is always 0 today because registrations are not built yet,
 * which makes "full" unreachable. Once registrations land, pass the real count
 * here and the "Full" chip starts working with no other changes.
 */
export function getEventStatus(
  event: ClubEvent,
  registeredCount = 0,
): EventStatus {
  if (isPastEvent(event)) return "closed";
  if (event.capacity != null && registeredCount >= event.capacity) return "full";
  return "open";
}

/** Splits events into upcoming (soonest first) and past (most recent first). */
export function partitionEvents(events: ClubEvent[], now = Date.now()) {
  const upcoming: ClubEvent[] = [];
  const past: ClubEvent[] = [];

  for (const event of events) {
    if (isPastEvent(event, now)) {
      past.push(event);
    } else {
      upcoming.push(event);
    }
  }

  const startOf = (event: ClubEvent) =>
    event.start_time ? new Date(event.start_time).getTime() : 0;

  upcoming.sort((a, b) => startOf(a) - startOf(b));
  past.sort((a, b) => startOf(b) - startOf(a));

  return { upcoming, past };
}

// These render inside server components, and the deployed container runs UTC,
// so the timezone has to be pinned or NZ users see the wrong local time.
const NZ_TIME_ZONE = "Pacific/Auckland";
const LOCALE = "en-NZ";

const timeFormatter = new Intl.DateTimeFormat(LOCALE, {
  timeZone: NZ_TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const shortDateFormatter = new Intl.DateTimeFormat(LOCALE, {
  timeZone: NZ_TIME_ZONE,
  day: "numeric",
  month: "short",
});

const longDateFormatter = new Intl.DateTimeFormat(LOCALE, {
  timeZone: NZ_TIME_ZONE,
  day: "numeric",
  month: "long",
});

/** Card header format, e.g. `{ time: "18:30", date: "28 Apr" }`. */
export function formatCardDateTime(iso: string | null) {
  if (!iso) return null;

  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;

  return {
    time: timeFormatter.format(date),
    date: shortDateFormatter.format(date),
  };
}

/** Detail view format, e.g. `{ date: "28 April", time: "18:30" }`. */
export function formatDetailDateTime(iso: string | null) {
  if (!iso) return null;

  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;

  return {
    date: longDateFormatter.format(date),
    time: timeFormatter.format(date),
  };
}
