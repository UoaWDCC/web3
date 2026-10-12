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
  event_url: string | null;
  event_path: string | null;
  // Luma registration page the Register button opens.
  registration_url: string | null;
};

export type EventStatus = "open" | "closed";

const LUMA_HOSTS = ["lu.ma", "luma.com"];

/**
 * Validates an admin-entered Luma link. Returns null for an empty value and
 * throws when the link is not an https Luma URL, since it is rendered as a
 * public link on the event page.
 */
export function normalizeRegistrationUrl(raw: unknown) {
  if (raw != null && typeof raw !== "string") {
    throw new Error("Registration link must be a valid URL");
  }
  const value = raw?.trim();
  if (!value) return null;

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("Registration link must be a valid URL");
  }

  const host = url.hostname.toLowerCase();
  const isLuma = LUMA_HOSTS.some(
    (lumaHost) => host === lumaHost || host.endsWith(`.${lumaHost}`),
  );

  if (url.protocol !== "https:" || !isLuma) {
    throw new Error("Registration link must be an https lu.ma or luma.com URL");
  }

  return url.toString();
}

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
 * The single place event status is decided. Capacity is managed on Luma, so
 * the site only distinguishes upcoming from finished events.
 */
export function getEventStatus(event: ClubEvent): EventStatus {
  return isPastEvent(event) ? "closed" : "open";
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
