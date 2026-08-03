import { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";

import { Badge, BadgeType } from "../../lib/schemas/badge";
import { MemberBadge } from "../../lib/schemas/member-badge";
import MemberBadgesService from "./member-badges-service";

const AWARD_ID = "9c1d7b3e-5a2f-4e18-b7d0-2c6a4f9e8b11";
const BADGE_ID = "3f7c1e2a-1b4d-4c6f-9a2e-8d5b0c7f1a33";
const MEMBER_ID = "5e8a2c4b-6d31-4f97-a02e-1b7c9d4e6f85";
const ATTENDANCE_ID = "7b2e4d19-3c8a-4f52-9e61-0a3d5c8b7f24";

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
 * query; the last one repeats once the queue runs dry, which is what the
 * duplicate-award path needs since it issues a second query after the conflict.
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

function awardRow(overrides: Partial<MemberBadge> = {}): MemberBadge {
  return {
    id: AWARD_ID,
    awardedat: "2026-08-03T00:00:00+00:00",
    badgeid: BADGE_ID,
    memberid: MEMBER_ID,
    attendanceid: null,
    ...overrides,
  };
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

describe("MemberBadgesService", () => {
  describe("awardBadge", () => {
    it("inserts into the member_badges table and returns the award", async () => {
      const fake = fakeSupabase({ data: awardRow(), error: null });

      const award = await new MemberBadgesService(fake.client).awardBadge({
        badgeid: BADGE_ID,
        memberid: MEMBER_ID,
      });

      expect(fake.from).toHaveBeenCalledWith("member_badges");
      expect(award.id).toBe(AWARD_ID);
    });

    it("defaults attendanceid to null when the caller omits it", async () => {
      const fake = fakeSupabase({ data: awardRow(), error: null });

      await new MemberBadgesService(fake.client).awardBadge({
        badgeid: BADGE_ID,
        memberid: MEMBER_ID,
      });

      expect(fake.builder.insert).toHaveBeenCalledWith({
        badgeid: BADGE_ID,
        memberid: MEMBER_ID,
        attendanceid: null,
      });
    });

    it("passes an attendance id through when one is given", async () => {
      const fake = fakeSupabase({
        data: awardRow({ attendanceid: ATTENDANCE_ID }),
        error: null,
      });

      const award = await new MemberBadgesService(fake.client).awardBadge({
        badgeid: BADGE_ID,
        memberid: MEMBER_ID,
        attendanceid: ATTENDANCE_ID,
      });

      expect(fake.builder.insert).toHaveBeenCalledWith({
        badgeid: BADGE_ID,
        memberid: MEMBER_ID,
        attendanceid: ATTENDANCE_ID,
      });
      expect(award.attendanceid).toBe(ATTENDANCE_ID);
    });

    it("never sends an id or awardedat — the database generates those", async () => {
      const fake = fakeSupabase({ data: awardRow(), error: null });

      await new MemberBadgesService(fake.client).awardBadge({
        badgeid: BADGE_ID,
        memberid: MEMBER_ID,
      });

      const [payload] = fake.builder.insert.mock.calls[0];
      expect(payload).not.toHaveProperty("id");
      expect(payload).not.toHaveProperty("awardedat");
    });

    it("rejects a badgeid that isn't a uuid without touching the database", async () => {
      const fake = fakeSupabase({ data: null, error: null });

      await expect(
        new MemberBadgesService(fake.client).awardBadge({
          badgeid: "not-a-uuid",
          memberid: MEMBER_ID,
        }),
      ).rejects.toThrow();

      expect(fake.from).not.toHaveBeenCalled();
    });

    it("rejects a memberid passed as a registrations-style bigint", async () => {
      const fake = fakeSupabase({ data: null, error: null });

      await expect(
        new MemberBadgesService(fake.client).awardBadge({
          badgeid: BADGE_ID,
          // memberid is a public_profiles uuid, not registrations.id — this is
          // the confusion the schema guards against.
          memberid: 99 as unknown as string,
        }),
      ).rejects.toThrow();

      expect(fake.from).not.toHaveBeenCalled();
    });

    it("is idempotent — a duplicate award returns the existing row", async () => {
      const fake = fakeSupabase([
        { data: null, error: dbError("23505", "duplicate key value") },
        { data: awardRow(), error: null },
      ]);

      const award = await new MemberBadgesService(fake.client).awardBadge({
        badgeid: BADGE_ID,
        memberid: MEMBER_ID,
      });

      expect(award.id).toBe(AWARD_ID);
    });

    it("looks the existing award up by badge and member after a conflict", async () => {
      const fake = fakeSupabase([
        { data: null, error: dbError("23505") },
        { data: awardRow(), error: null },
      ]);

      await new MemberBadgesService(fake.client).awardBadge({
        badgeid: BADGE_ID,
        memberid: MEMBER_ID,
      });

      expect(fake.builder.eq).toHaveBeenCalledWith("badgeid", BADGE_ID);
      expect(fake.builder.eq).toHaveBeenCalledWith("memberid", MEMBER_ID);
    });

    it("rethrows the conflict if the existing award can't be found", async () => {
      const fake = fakeSupabase([
        { data: null, error: dbError("23505") },
        { data: null, error: null },
      ]);

      await expect(
        new MemberBadgesService(fake.client).awardBadge({
          badgeid: BADGE_ID,
          memberid: MEMBER_ID,
        }),
      ).rejects.toMatchObject({ code: "23505" });
    });

    it("rethrows errors that aren't unique violations", async () => {
      const fake = fakeSupabase({
        data: null,
        error: dbError("23503", "foreign key violation"),
      });

      await expect(
        new MemberBadgesService(fake.client).awardBadge({
          badgeid: BADGE_ID,
          memberid: MEMBER_ID,
        }),
      ).rejects.toMatchObject({ code: "23503" });
    });
  });

  describe("getAward", () => {
    it("filters on both the badge and the member", async () => {
      const fake = fakeSupabase({ data: awardRow(), error: null });

      const award = await new MemberBadgesService(fake.client).getAward(
        BADGE_ID,
        MEMBER_ID,
      );

      expect(fake.builder.eq).toHaveBeenCalledWith("badgeid", BADGE_ID);
      expect(fake.builder.eq).toHaveBeenCalledWith("memberid", MEMBER_ID);
      expect(award?.id).toBe(AWARD_ID);
    });

    it("returns null when the member doesn't hold the badge", async () => {
      const fake = fakeSupabase({ data: null, error: null });

      await expect(
        new MemberBadgesService(fake.client).getAward(BADGE_ID, MEMBER_ID),
      ).resolves.toBeNull();
    });

    it("throws the database error when the lookup fails", async () => {
      const fake = fakeSupabase({ data: null, error: dbError("42501") });

      await expect(
        new MemberBadgesService(fake.client).getAward(BADGE_ID, MEMBER_ID),
      ).rejects.toMatchObject({ code: "42501" });
    });
  });

  describe("hasBadge", () => {
    it("is true when an award exists", async () => {
      const fake = fakeSupabase({ data: awardRow(), error: null });

      await expect(
        new MemberBadgesService(fake.client).hasBadge(BADGE_ID, MEMBER_ID),
      ).resolves.toBe(true);
    });

    it("is false when no award exists", async () => {
      const fake = fakeSupabase({ data: null, error: null });

      await expect(
        new MemberBadgesService(fake.client).hasBadge(BADGE_ID, MEMBER_ID),
      ).resolves.toBe(false);
    });
  });

  describe("getBadgesForMember", () => {
    it("embeds the badge, filters on the member and orders by award date", async () => {
      const fake = fakeSupabase({ data: [], error: null });

      await new MemberBadgesService(fake.client).getBadgesForMember(MEMBER_ID);

      expect(fake.builder.select).toHaveBeenCalledWith("*, badge:badges(*)");
      expect(fake.builder.eq).toHaveBeenCalledWith("memberid", MEMBER_ID);
      expect(fake.builder.order).toHaveBeenCalledWith("awardedat", {
        ascending: false,
      });
    });

    it("returns the awards with their badge attached", async () => {
      const fake = fakeSupabase({
        data: [{ ...awardRow(), badge: badgeRow() }],
        error: null,
      });

      const held = await new MemberBadgesService(
        fake.client,
      ).getBadgesForMember(MEMBER_ID);

      expect(held).toHaveLength(1);
      expect(held[0].badge.name).toBe("Testing Badge");
    });

    it("returns an empty array rather than null when the member holds none", async () => {
      const fake = fakeSupabase({ data: null, error: null });

      await expect(
        new MemberBadgesService(fake.client).getBadgesForMember(MEMBER_ID),
      ).resolves.toEqual([]);
    });
  });

  describe("getMembersWithBadge", () => {
    it("filters on the badge and orders by award date", async () => {
      const fake = fakeSupabase({ data: [awardRow()], error: null });

      const holders = await new MemberBadgesService(
        fake.client,
      ).getMembersWithBadge(BADGE_ID);

      expect(fake.builder.eq).toHaveBeenCalledWith("badgeid", BADGE_ID);
      expect(fake.builder.order).toHaveBeenCalledWith("awardedat", {
        ascending: false,
      });
      expect(holders).toHaveLength(1);
    });

    it("returns an empty array rather than null when nobody holds it", async () => {
      const fake = fakeSupabase({ data: null, error: null });

      await expect(
        new MemberBadgesService(fake.client).getMembersWithBadge(BADGE_ID),
      ).resolves.toEqual([]);
    });
  });

  describe("revokeBadge", () => {
    it("deletes the row matching both the badge and the member", async () => {
      const fake = fakeSupabase({ data: null, error: null });

      await new MemberBadgesService(fake.client).revokeBadge(
        BADGE_ID,
        MEMBER_ID,
      );

      expect(fake.builder.delete).toHaveBeenCalled();
      expect(fake.builder.eq).toHaveBeenCalledWith("badgeid", BADGE_ID);
      expect(fake.builder.eq).toHaveBeenCalledWith("memberid", MEMBER_ID);
    });

    it("resolves without error when the member doesn't hold the badge", async () => {
      const fake = fakeSupabase({ data: null, error: null });

      await expect(
        new MemberBadgesService(fake.client).revokeBadge(BADGE_ID, MEMBER_ID),
      ).resolves.toBeUndefined();
    });

    it("throws the database error when the delete fails", async () => {
      const fake = fakeSupabase({ data: null, error: dbError("42501") });

      await expect(
        new MemberBadgesService(fake.client).revokeBadge(BADGE_ID, MEMBER_ID),
      ).rejects.toMatchObject({ code: "42501" });
    });
  });

  describe("revokeAwardById", () => {
    it("deletes by the join row's own id", async () => {
      const fake = fakeSupabase({ data: null, error: null });

      await new MemberBadgesService(fake.client).revokeAwardById(AWARD_ID);

      expect(fake.builder.delete).toHaveBeenCalled();
      expect(fake.builder.eq).toHaveBeenCalledWith("id", AWARD_ID);
    });

    it("throws the database error when the delete fails", async () => {
      const fake = fakeSupabase({ data: null, error: dbError("42501") });

      await expect(
        new MemberBadgesService(fake.client).revokeAwardById(AWARD_ID),
      ).rejects.toMatchObject({ code: "42501" });
    });
  });
});
