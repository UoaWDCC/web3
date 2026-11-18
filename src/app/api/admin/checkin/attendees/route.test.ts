import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { from, getSupabaseAdmin, isAllowedAdminAddress, verifyMessage } =
  vi.hoisted(() => ({
    from: vi.fn(),
    getSupabaseAdmin: vi.fn(),
    isAllowedAdminAddress: vi.fn(),
    verifyMessage: vi.fn(),
  }));

vi.mock("viem", () => ({ verifyMessage }));
vi.mock("@/lib/admin-auth", () => ({ isAllowedAdminAddress }));
vi.mock("@/services/supabase-admin", () => ({ getSupabaseAdmin }));

import { GET } from "./route";

function attendeesRequest(eventId = "event-1") {
  const timestamp = Date.now().toString();

  return new NextRequest(
    `http://localhost/api/admin/checkin/attendees?eventId=${eventId}`,
    {
      headers: {
        "x-admin-address": "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
        "x-admin-signature": "0xsigned",
        "x-admin-timestamp": timestamp,
      },
    },
  );
}

describe("GET /api/admin/checkin/attendees", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isAllowedAdminAddress.mockReturnValue(true);
    verifyMessage.mockResolvedValue(true);
    getSupabaseAdmin.mockReturnValue({ from });
  });

  it("returns members checked into the requested event", async () => {
    const query = {
      select: vi.fn().mockReturnThis(),
      contains: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: [
          {
            id: 42,
            email: "private@example.com",
            first_name: "Private",
            last_name: "Member",
            unique_name: null,
          },
          {
            id: 43,
            email: "member@example.com",
            first_name: "Member",
            last_name: "Name",
            unique_name: "Member42",
          },
        ],
        error: null,
      }),
    };
    from.mockReturnValue(query);

    const response = await GET(attendeesRequest());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual([
      { id: 42, name: "Private Member" },
      { id: 43, name: "Member42" },
    ]);
    expect(from).toHaveBeenCalledWith("registrations");
    expect(query.contains).toHaveBeenCalledWith("events_attended", ["event-1"]);
  });

  it("requires an event id", async () => {
    const response = await GET(attendeesRequest(""));

    expect(response.status).toBe(400);
  });
});
