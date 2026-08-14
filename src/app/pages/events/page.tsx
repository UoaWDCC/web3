import { EventCard } from "@/components/events/event-card";
import { partitionEvents } from "@/lib/events";
import { EventService } from "@/services/event-service";

// Newly created events should show up immediately rather than on a rebuild.
export const dynamic = "force-dynamic";

export default async function EventsPage() {
  const events = await EventService.listEvents();
  const { upcoming, past } = partitionEvents(events);

  return (
    <main className="min-h-screen pt-28">
      {/* Width tracks the navbar (see navbar.tsx) so the two line up. */}
      <div className="mx-auto mb-20 mt-20 w-[95%] rounded-[48px] bg-nav-bg p-8 shadow-xl sm:w-[90%] md:p-16 lg:w-[85%] xl:w-[80%]">
        <header className="mb-14 text-center">
          <h1 className="mb-4 text-5xl font-black leading-tight tracking-tight text-hero-text md:text-6xl">
            Upcoming events
          </h1>
          <p className="text-xl font-medium text-hero-text">
            From launch nights to industry meetups,
            <br />
            see what our community has been up to.
          </p>
        </header>

        {upcoming.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {upcoming.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        ) : (
          <p className="text-center text-lg font-medium text-hero-text opacity-70">
            No upcoming events right now — check back soon.
          </p>
        )}

        {past.length > 0 && (
          <>
            <h2 className="mb-10 mt-20 text-center text-4xl font-black leading-tight tracking-tight text-hero-text md:text-5xl">
              Past events
            </h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {past.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
