import { describe, expect, it } from "vitest";

import { resolveAttendedEvents } from "./event-service";

const EVENTS = [
  {
    id: "ed6707c8-232b-403e-ac17-6e64eef72790",
    title: "Launch Night",
    event_url: "https://example.com/launch.webp",
  },
  {
    id: "deba40f2-35af-47a3-8827-448146588e09",
    title: "Crochet Workshop",
    event_url: "https://example.com/crochet.jpg",
  },
];

describe("resolveAttendedEvents", () => {
  it("resolves UUID attendance values to the event title and poster", () => {
    const result = resolveAttendedEvents([EVENTS[0].id], EVENTS);

    expect(result).toEqual({
      events: [
        {
          id: EVENTS[0].id,
          title: "Launch Night",
          eventUrl: "https://example.com/launch.webp",
        },
      ],
      unavailableCount: 0,
    });
  });

  it("supports legacy title values without case or whitespace sensitivity", () => {
    const result = resolveAttendedEvents(["  crochet workshop  "], EVENTS);

    expect(result.events[0]).toMatchObject({
      id: EVENTS[1].id,
      title: "Crochet Workshop",
      eventUrl: "https://example.com/crochet.jpg",
    });
    expect(result.unavailableCount).toBe(0);
  });

  it("does not expose dangling event IDs or assign them an unrelated poster", () => {
    const result = resolveAttendedEvents(
      ["62d08d91-6a21-4949-9041-e2bd2c15c86d"],
      EVENTS,
    );

    expect(result).toEqual({ events: [], unavailableCount: 1 });
  });

  it("deduplicates repeated attendance values while preserving order", () => {
    const result = resolveAttendedEvents(
      [EVENTS[1].id, EVENTS[0].id, EVENTS[1].id],
      EVENTS,
    );

    expect(result.events.map((event) => event.id)).toEqual([
      EVENTS[1].id,
      EVENTS[0].id,
    ]);
  });
});
