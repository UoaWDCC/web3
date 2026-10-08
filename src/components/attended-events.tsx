"use client";

import { useEffect, useState } from "react";

import {
  EventService,
  type AttendedEventResolution,
} from "@/services/event-service";

type AttendedEventsProps = {
  attendanceReferences: string[];
  profileLoading?: boolean;
};

const EMPTY_RESOLUTION: AttendedEventResolution = {
  events: [],
  unavailableCount: 0,
};

export function AttendedEvents({
  attendanceReferences,
  profileLoading = false,
}: AttendedEventsProps) {
  const [resolution, setResolution] =
    useState<AttendedEventResolution>(EMPTY_RESOLUTION);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    if (attendanceReferences.length === 0) {
      setResolution(EMPTY_RESOLUTION);
      setDetailsLoading(false);
      setLoadFailed(false);
      return;
    }

    setDetailsLoading(true);
    setLoadFailed(false);

    EventService.getAttendedEvents(attendanceReferences)
      .then((result) => {
        if (!cancelled) {
          setResolution(result);
        }
      })
      .catch((error) => {
        console.error("Unable to load attended event details", error);

        if (!cancelled) {
          setResolution(EMPTY_RESOLUTION);
          setLoadFailed(true);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setDetailsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [attendanceReferences]);

  if (profileLoading || detailsLoading) {
    return (
      <p className="text-muted-foreground dark:text-white/70">
        Loading event history…
      </p>
    );
  }

  if (loadFailed) {
    return (
      <p className="text-muted-foreground dark:text-white/70">
        Event history is unavailable right now.
      </p>
    );
  }

  if (attendanceReferences.length === 0) {
    return (
      <p className="text-muted-foreground dark:text-white/70">
        No events attended yet.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {resolution.events.map((event) => (
        <div
          key={event.id}
          className="overflow-hidden rounded-3xl border border-primary/20 bg-white/95 shadow-sm dark:border-white/10 dark:bg-slate-900"
        >
          <div className="relative aspect-[16/9] w-full bg-neutral-200 dark:bg-neutral-700">
            {event.eventUrl ? (
              <img
                src={event.eventUrl}
                alt={`${event.title} poster`}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center px-4 text-center text-sm text-muted-foreground dark:text-white/65">
                Image unavailable
              </div>
            )}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent px-4 py-3">
              <p className="text-sm font-semibold text-white">{event.title}</p>
            </div>
          </div>
        </div>
      ))}

      {resolution.unavailableCount > 0 && (
        <p className="rounded-2xl bg-primary/10 px-4 py-3 text-sm text-muted-foreground dark:bg-white/10 dark:text-white/70">
          {resolution.unavailableCount === 1
            ? "Details for one past event are no longer available."
            : `Details for ${resolution.unavailableCount} past events are no longer available.`}
        </p>
      )}
    </div>
  );
}
