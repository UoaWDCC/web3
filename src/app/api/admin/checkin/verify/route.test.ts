import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
  from,
  getSupabaseAdmin,
  isAllowedAdminAddress,
  verifyMessage,
  getBadgeByEventId,
  awardBadge,
} = vi.hoisted(() => ({
  from: vi.fn(),
  getSupabaseAdmin: vi.fn(),
  isAllowedAdminAddress: vi.fn(),
  verifyMessage: vi.fn(),
  getBadgeByEventId: vi.fn(),
  awardBadge: vi.fn(),
}));

vi.mock("viem", () => ({ verifyMessage }));
vi.mock("@/lib/admin-auth", () => ({ isAllowedAdminAddress }));
vi.mock("@/services/supabase-admin", () => ({ getSupabaseAdmin }));
// The route constructs these with `new`, so the mocks have to be classes.
vi.mock("@/services/badges/badges-service", () => ({
  default: class {
    getBadgeByEventId = getBadgeByEventId;
  },
}));
vi.mock("@/services/member-badges/member-badges-service", () => ({
  default: class {
    awardBadge = awardBadge;
  },
}));

import { POST } from "./route";

const BADGE_ID = "3f7c1e2a-1b4d-4c6f-9a2e-8d5b0c7f1a33";

function checkInRequest() {
  const timestamp = Date.now().toString();

  return new NextRequest("http://localhost/api/admin/checkin/verify", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-admin-address": "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
      "x-admin-signature": "0xsigned",
      "x-admin-timestamp": timestamp,
    },
    body: JSON.stringify({ qrSecret: "private-member-qr", eventId: "event-1" }),
  });
}

/**
 * Serves the QR credential and the registration lookups, and records the
 * events_attended update. The badge lookups go through the mocked services.
 */
function mockMember(eventsAttended: string[]) {
  const credential = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({
      data: { registration_id: 42 },
      error: null,
    }),
  };
  const registration = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({
      data: {
        id: 42,
        email: "private@example.com",
        first_name: "Private",
        last_name: "Member",
        unique_name: null,
        events_attended: eventsAttended,
      },
      error: null,
    }),
  };
  const update = {
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockResolvedValue({ error: null }),
  };
  let registrationCalls = 0;

  from.mockImplementation((table: string) => {
    if (table === "profile_qr_credentials") return credential;
    if (table === "registrations") {
      registrationCalls += 1;
      return registrationCalls === 1 ? registration : update;
    }
    throw new Error(`Unexpected table: ${table}`);
  });

  return { update };
}

function eventBadge(overrides: { isactive?: boolean } = {}) {
  return {
    id: BADGE_ID,
    name: "Launch Night 2026",
    eventid: "event-1",
    isactive: true,
    ...overrides,
  };
}

describe("POST /api/admin/checkin/verify", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isAllowedAdminAddress.mockReturnValue(true);
    verifyMessage.mockResolvedValue(true);
    getSupabaseAdmin.mockReturnValue({ from });
    getBadgeByEventId.mockResolvedValue(null);
    awardBadge.mockResolvedValue({});
  });

  it("checks in a private member without reading public_profiles", async () => {
    const { update } = mockMember([]);

    const response = await POST(checkInRequest());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      alreadyCheckedIn: false,
      member: { name: "Private Member" },
      badge: null,
    });
    expect(update.update).toHaveBeenCalledWith({
      events_attended: ["event-1"],
    });
    expect(from).not.toHaveBeenCalledWith("public_profiles");
  });

  it("awards the event's badge when the member checks in", async () => {
    mockMember([]);
    getBadgeByEventId.mockResolvedValue(eventBadge());

    const response = await POST(checkInRequest());

    expect(getBadgeByEventId).toHaveBeenCalledWith("event-1");
    expect(awardBadge).toHaveBeenCalledWith({
      badgeid: BADGE_ID,
      memberid: 42,
    });
    await expect(response.json()).resolves.toMatchObject({
      alreadyCheckedIn: false,
      badge: { name: "Launch Night 2026" },
    });
  });

  it("awards the badge to a member who was already checked in", async () => {
    const { update } = mockMember(["event-1"]);
    getBadgeByEventId.mockResolvedValue(eventBadge());

    const response = await POST(checkInRequest());

    expect(update.update).not.toHaveBeenCalled();
    expect(awardBadge).toHaveBeenCalledWith({
      badgeid: BADGE_ID,
      memberid: 42,
    });
    await expect(response.json()).resolves.toMatchObject({
      alreadyCheckedIn: true,
      badge: { name: "Launch Night 2026" },
    });
  });

  it("doesn't award an inactive badge", async () => {
    mockMember([]);
    getBadgeByEventId.mockResolvedValue(eventBadge({ isactive: false }));

    const response = await POST(checkInRequest());

    expect(awardBadge).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toMatchObject({ badge: null });
  });

  it("still checks the member in when awarding the badge fails", async () => {
    const { update } = mockMember([]);
    getBadgeByEventId.mockResolvedValue(eventBadge());
    awardBadge.mockRejectedValue(new Error("award failed"));
    vi.spyOn(console, "error").mockImplementation(() => {});

    const response = await POST(checkInRequest());

    expect(response.status).toBe(200);
    expect(update.update).toHaveBeenCalledWith({
      events_attended: ["event-1"],
    });
    await expect(response.json()).resolves.toMatchObject({
      success: true,
      alreadyCheckedIn: false,
      badge: null,
    });
  });
});
