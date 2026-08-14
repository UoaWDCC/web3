import { notFound } from "next/navigation";
import { MapPin } from "lucide-react";

import { RegisterButton } from "@/components/events/register-button";
import { formatDetailDateTime, isPastEvent } from "@/lib/events";
import { EventService } from "@/services/event-service";

export const dynamic = "force-dynamic";

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const event = await EventService.getEventById(id);

  if (!event) {
    notFound();
  }

  const when = formatDetailDateTime(event.start_time);
  const title = event.title || "Untitled event";

  return (
    <main className="min-h-screen pt-28">
      {/* Width tracks the navbar (see navbar.tsx) so the two line up. */}
      <div className="mx-auto mb-20 mt-20 w-[95%] rounded-[48px] bg-nav-bg p-8 shadow-xl sm:w-[90%] md:p-16 lg:w-[85%] xl:w-[80%]">
        <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
          {/* Poster sits in a neutral frame; object-contain because event
              posters are usually portrait and must not be cropped. */}
          <div className="flex items-center justify-center rounded-3xl bg-neutral-300 p-4 dark:bg-neutral-700">
            {event.event_url ? (
              <img
                src={event.event_url}
                alt={title}
                className="max-h-[520px] w-full rounded-2xl object-contain"
              />
            ) : (
              <div className="aspect-[3/4] w-full rounded-2xl" />
            )}
          </div>

          <div className="flex flex-col gap-6">
            <div className="flex items-start justify-between gap-6">
              <h1 className="text-4xl font-black leading-tight tracking-tight text-hero-text md:text-6xl">
                {title}
              </h1>
              <span className="mt-2 size-20 shrink-0 rounded-full bg-[#D8B6F7] md:size-28" />
            </div>

            <div className="flex flex-col gap-2">
              {event.location && (
                <p className="flex items-start gap-2 text-xl font-medium text-hero-text">
                  <MapPin className="mt-1 size-5 shrink-0 fill-current" />
                  <span>{event.location}</span>
                </p>
              )}
              {when && (
                <p className="flex gap-4 text-xl font-medium text-hero-text opacity-70">
                  <span>{when.date}</span>
                  <span>{when.time}</span>
                </p>
              )}
            </div>

            {event.description && (
              <p className="max-w-xl whitespace-pre-line text-lg leading-relaxed text-hero-text">
                {event.description}
              </p>
            )}

            <div className="mt-2">
              <RegisterButton eventTitle={title} isPast={isPastEvent(event)} />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
