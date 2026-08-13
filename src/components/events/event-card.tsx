import Link from "next/link";
import { MapPin } from "lucide-react";

import {
  formatCardDateTime,
  getEventStatus,
  type ClubEvent,
  type EventStatus,
} from "@/lib/events";

// Dot colours come from the site's existing accent palette (see about.tsx).
// `Open` needs explicit dark variants because --color-web3 flips to light blue
// in dark mode, which would make it indistinguishable from `Full`.
const STATUS_STYLES: Record<EventStatus, { label: string; dot: string }> = {
  open: { label: "Open", dot: "bg-[#3F65E2] dark:bg-[#D8B6F7]" },
  full: { label: "Full", dot: "bg-[#A3DEF4]" },
  closed: { label: "Closed", dot: "bg-neutral-400 dark:bg-neutral-500" },
};

function Chip({ dot, label }: { dot: string; label: string }) {
  return (
    <span className="flex items-center gap-2 text-sm font-medium text-hero-text">
      <span className={`size-3 shrink-0 rounded-full ${dot}`} />
      {label}
    </span>
  );
}

export function EventCard({ event }: { event: ClubEvent }) {
  const when = formatCardDateTime(event.start_time);
  const status = STATUS_STYLES[getEventStatus(event)];

  return (
    <Link
      href={`/pages/events/${event.id}`}
      className="flex flex-col gap-4 rounded-3xl border border-white/60 bg-white/70 p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg dark:border-white/25 dark:bg-transparent"
    >
      {/* Time + date, with the decorative circle from the design */}
      <div className="flex items-start justify-between gap-3">
        <p className="flex gap-3 text-base font-medium text-hero-text">
          {when ? (
            <>
              <span>{when.time}</span>
              <span>{when.date}</span>
            </>
          ) : (
            <span className="opacity-60">Date TBC</span>
          )}
        </p>
        <span className="size-7 shrink-0 rounded-full bg-[#D8B6F7]" />
      </div>

      <h3 className="text-2xl font-black leading-tight tracking-tight text-hero-text">
        {event.title || "Untitled event"}
      </h3>

      {/* Poster. Plain <img> because event_url is a runtime Supabase URL. */}
      <div className="aspect-[4/3] w-full overflow-hidden rounded-2xl bg-neutral-300 dark:bg-neutral-400">
        {event.event_url && (
          <img
            src={event.event_url}
            alt={event.title || "Event poster"}
            className="h-full w-full object-cover"
          />
        )}
      </div>

      <div className="mt-auto flex flex-col gap-3">
        {event.location && (
          <p className="flex items-start gap-2 text-sm text-hero-text">
            <MapPin className="mt-0.5 size-4 shrink-0 fill-current" />
            <span>{event.location}</span>
          </p>
        )}

        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
          <Chip dot="bg-[#92ABFF]" label="In-person" />
          <Chip dot={status.dot} label={status.label} />
        </div>
      </div>
    </Link>
  );
}
