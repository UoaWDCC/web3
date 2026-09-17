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

import { POST } from "./route";

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

describe("POST /api/admin/checkin/verify", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isAllowedAdminAddress.mockReturnValue(true);
    verifyMessage.mockResolvedValue(true);
    getSupabaseAdmin.mockReturnValue({ from });
  });

  it("checks in a private member without reading public_profiles", async () => {
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
          events_attended: [],
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

    const response = await POST(checkInRequest());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      alreadyCheckedIn: false,
      member: { name: "Private Member" },
    });
    expect(update.update).toHaveBeenCalledWith({
      events_attended: ["event-1"],
    });
    expect(from).not.toHaveBeenCalledWith("public_profiles");
  });
});
