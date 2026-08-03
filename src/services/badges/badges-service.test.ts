import { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";

import { Badge, BadgeType } from "../../lib/schemas/badge";
import BadgesService from "./badges-service";

const BADGE_ID = "3f7c1e2a-1b4d-4c6f-9a2e-8d5b0c7f1a33";
const EVENT_ID = "ed6707c8-232b-403e-ac17-6e64eef72790";

type MockFn = ReturnType<typeof vi.fn>;

interface QueryResult {
  data: unknown;
  error: unknown;
}

interface Builder {
  select: MockFn;
  insert: MockFn;
  update: MockFn;
  delete: MockFn;
  eq: MockFn;
  order: MockFn;
  single: MockFn;
  maybeSingle: MockFn;
  then: PromiseLike<QueryResult>["then"];
}

/**
 * A stand-in for the Supabase client that records the query it was asked to
 * build and resolves to a canned result. Pass an array to serve one result per
 * query; the last one repeats once the queue runs dry.
 *
 * Real PostgREST builders are thenable, which is why `await from(x).select()`
 * resolves without a terminal `.single()` — hence the `then` below.
 */
function fakeSupabase(results: QueryResult | QueryResult[]) {
  const queue = Array.isArray(results) ? [...results] : [results];
  const next = (): QueryResult => (queue.length > 1 ? queue.shift()! : queue[0]);

  const chainable = (): MockFn => vi.fn(() => builder);

  const builder: Builder = {
    select: chainable(),
    insert: chainable(),
    update: chainable(),
    delete: chainable(),
    eq: chainable(),
    order: chainable(),
    single: vi.fn(() => Promise.resolve(next())),
    maybeSingle: vi.fn(() => Promise.resolve(next())),
    then: (onFulfilled, onRejected) =>
      Promise.resolve(next()).then(onFulfilled, onRejected),
  };

  const from = vi.fn(() => builder);

  return { client: { from } as unknown as SupabaseClient, from, builder };
}

/** A Postgres error shaped the way supabase-js surfaces it. */
function dbError(code: string, message = "stubbed failure") {
  return { code, message, details: null, hint: null };
}

function badgeRow(overrides: Partial<Badge> = {}): Badge {
  return {
    id: BADGE_ID,
    created_at: "2026-08-03T00:00:00+00:00",
    name: "Testing Badge",
    category: BadgeType.Achievement,
    description: "Awarded for shipping the badge system",
    imageurl: null,
    criteria: "Our code works fine",
    eventid: null,
    isactive: true,
    ...overrides,
  };
}

describe("BadgesService", () => {
  describe("createBadge", () => {
    it("inserts into the badges table and returns the created row", async () => {
      const fake = fakeSupabase({ data: badgeRow(), error: null });

      const created = await new BadgesService(fake.client).createBadge({
        name: "Testing Badge",
        category: BadgeType.Achievement,
        criteria: "Our code works fine",
      });

      expect(fake.from).toHaveBeenCalledWith("badges");
      expect(created.id).toBe(BADGE_ID);
    });

    it("fills in defaults for the optional fields the caller omitted", async () => {
      const fake = fakeSupabase({ data: badgeRow(), error: null });

      await new BadgesService(fake.client).createBadge({
        name: "Testing Badge",
        category: BadgeType.Achievement,
      });

      expect(fake.builder.insert).toHaveBeenCalledWith({
        name: "Testing Badge",
        category: BadgeType.Achievement,
        description: null,
        imageurl: null,
        criteria: null,
        eventid: null,
        isactive: true,
      });
    });

    it("never sends an id or created_at — the database generates those", async () => {
      const fake = fakeSupabase({ data: badgeRow(), error: null });

      await new BadgesService(fake.client).createBadge({
        name: "Testing Badge",
        category: BadgeType.Achievement,
      });

      const [payload] = fake.builder.insert.mock.calls[0];
      expect(payload).not.toHaveProperty("id");
      expect(payload).not.toHaveProperty("created_at");
    });

    it("trims the badge name", async () => {
      const fake = fakeSupabase({ data: badgeRow(), error: null });

      await new BadgesService(fake.client).createBadge({
        name: "   Testing Badge   ",
        category: BadgeType.Achievement,
      });

      const [payload] = fake.builder.insert.mock.calls[0];
      expect(payload.name).toBe("Testing Badge");
    });

    it("rejects a blank name without touching the database", async () => {
      const fake = fakeSupabase({ data: null, error: null });

      await expect(
        new BadgesService(fake.client).createBadge({
          name: "   ",
          category: BadgeType.Achievement,
        }),
      ).rejects.toThrow(/Badge name is required/);

      expect(fake.from).not.toHaveBeenCalled();
    });

    it("rejects an EVENT badge that references no event", async () => {
      const fake = fakeSupabase({ data: null, error: null });

      await expect(
        new BadgesService(fake.client).createBadge({
          name: "Hackathon 2026",
          category: BadgeType.Event,
        }),
      ).rejects.toThrow(/must reference an event/);

      expect(fake.from).not.toHaveBeenCalled();
    });

    it("accepts an EVENT badge that does reference an event", async () => {
      const fake = fakeSupabase({
        data: badgeRow({ category: BadgeType.Event, eventid: EVENT_ID }),
        error: null,
      });

      const created = await new BadgesService(fake.client).createBadge({
        name: "Hackathon 2026",
        category: BadgeType.Event,
        eventid: EVENT_ID,
      });

      expect(created.eventid).toBe(EVENT_ID);
    });

    it("throws the database error when the insert fails", async () => {
      const fake = fakeSupabase({
        data: null,
        error: dbError("42501", "row-level security policy"),
      });

      await expect(
        new BadgesService(fake.client).createBadge({
          name: "Testing Badge",
          category: BadgeType.Achievement,
        }),
      ).rejects.toMatchObject({ code: "42501" });
    });
  });

  describe("getBadgeById", () => {
    it("filters on the id and returns the badge", async () => {
      const fake = fakeSupabase({ data: badgeRow(), error: null });

      const badge = await new BadgesService(fake.client).getBadgeById(BADGE_ID);

      expect(fake.builder.eq).toHaveBeenCalledWith("id", BADGE_ID);
      expect(badge?.name).toBe("Testing Badge");
    });

    it("returns null when no badge has that id", async () => {
      const fake = fakeSupabase({ data: null, error: null });

      const badge = await new BadgesService(fake.client).getBadgeById(BADGE_ID);

      expect(badge).toBeNull();
    });
  });

  describe("getAllBadges", () => {
    it("returns every row", async () => {
      const fake = fakeSupabase({
        data: [badgeRow(), badgeRow({ id: EVENT_ID, name: "Second" })],
        error: null,
      });

      const badges = await new BadgesService(fake.client).getAllBadges();

      expect(badges).toHaveLength(2);
    });

    it("returns an empty array rather than null when there are none", async () => {
      const fake = fakeSupabase({ data: null, error: null });

      await expect(
        new BadgesService(fake.client).getAllBadges(),
      ).resolves.toEqual([]);
    });
  });

  describe("getAllBadgesByName", () => {
    it("trims the name before matching", async () => {
      const fake = fakeSupabase({ data: [badgeRow()], error: null });

      await new BadgesService(fake.client).getAllBadgesByName(
        "  Testing Badge  ",
      );

      expect(fake.builder.eq).toHaveBeenCalledWith("name", "Testing Badge");
    });

    it("returns the badges that matched", async () => {
      const fake = fakeSupabase({ data: [badgeRow()], error: null });

      const badges = await new BadgesService(fake.client).getAllBadgesByName(
        "Testing Badge",
      );

      expect(badges).toHaveLength(1);
      expect(badges[0].id).toBe(BADGE_ID);
    });
  });

  describe("updateBadgeById", () => {
    it("sends only the fields the caller supplied", async () => {
      const fake = fakeSupabase({
        data: badgeRow({ name: "Updated Testing Badge" }),
        error: null,
      });

      const updated = await new BadgesService(fake.client).updateBadgeById(
        BADGE_ID,
        { name: "Updated Testing Badge" },
      );

      expect(fake.builder.update).toHaveBeenCalledWith({
        name: "Updated Testing Badge",
      });
      expect(fake.builder.eq).toHaveBeenCalledWith("id", BADGE_ID);
      expect(updated.name).toBe("Updated Testing Badge");
    });

    it("drops keys explicitly set to undefined", async () => {
      const fake = fakeSupabase({ data: badgeRow(), error: null });

      await new BadgesService(fake.client).updateBadgeById(BADGE_ID, {
        name: "Still Here",
        description: undefined,
      });

      expect(fake.builder.update).toHaveBeenCalledWith({ name: "Still Here" });
    });

    it("can null out an optional field", async () => {
      const fake = fakeSupabase({
        data: badgeRow({ criteria: null }),
        error: null,
      });

      await new BadgesService(fake.client).updateBadgeById(BADGE_ID, {
        criteria: null,
      });

      expect(fake.builder.update).toHaveBeenCalledWith({ criteria: null });
    });

    it("refuses an empty patch instead of issuing a no-op query", async () => {
      const fake = fakeSupabase({ data: null, error: null });

      await expect(
        new BadgesService(fake.client).updateBadgeById(BADGE_ID, {}),
      ).rejects.toThrow(/no fields to update/);

      expect(fake.from).not.toHaveBeenCalled();
    });

    it("throws the database error when the update fails", async () => {
      const fake = fakeSupabase({ data: null, error: dbError("42501") });

      await expect(
        new BadgesService(fake.client).updateBadgeById(BADGE_ID, {
          name: "Nope",
        }),
      ).rejects.toMatchObject({ code: "42501" });
    });
  });

  describe("deleteBadgeById", () => {
    it("deletes the row matching the id", async () => {
      const fake = fakeSupabase({ data: null, error: null });

      await new BadgesService(fake.client).deleteBadgeById(BADGE_ID);

      expect(fake.builder.delete).toHaveBeenCalled();
      expect(fake.builder.eq).toHaveBeenCalledWith("id", BADGE_ID);
    });

    it("throws the database error when the delete fails", async () => {
      const fake = fakeSupabase({ data: null, error: dbError("42501") });

      await expect(
        new BadgesService(fake.client).deleteBadgeById(BADGE_ID),
      ).rejects.toMatchObject({ code: "42501" });
    });
  });
});
