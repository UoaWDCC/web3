import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { from, getSupabaseAdmin, verifyWalletAuth } = vi.hoisted(() => ({
  from: vi.fn(),
  getSupabaseAdmin: vi.fn(),
  verifyWalletAuth: vi.fn(),
}));

vi.mock("@/lib/wallet-auth", () => ({ verifyWalletAuth }));
vi.mock("@/services/supabase-admin", () => ({ getSupabaseAdmin }));

import { GET } from "./route";

const request = () => new NextRequest("http://localhost/api/user/qr");

function queryResult<T>(result: T) {
  const builder = {
    select: vi.fn(),
    ilike: vi.fn(),
    eq: vi.fn(),
    insert: vi.fn(),
    single: vi.fn(),
    maybeSingle: vi.fn(),
  };

  builder.select.mockReturnValue(builder);
  builder.ilike.mockReturnValue(builder);
  builder.eq.mockReturnValue(builder);
  builder.single.mockResolvedValue(result);
  builder.maybeSingle.mockResolvedValue(result);

  return builder;
}

describe("GET /api/user/qr", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    verifyWalletAuth.mockResolvedValue(
      "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
    );
    getSupabaseAdmin.mockReturnValue({ from });
  });

  it("rejects callers who have not proved ownership of the wallet", async () => {
    verifyWalletAuth.mockResolvedValue(null);

    const response = await GET(request());

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
    expect(getSupabaseAdmin).not.toHaveBeenCalled();
  });

  it("returns a private member's existing QR without requiring a public profile", async () => {
    const registration = queryResult({ data: { id: 42 }, error: null });
    const credential = queryResult({
      data: { registration_id: 42, qr_secret: "saved-private-qr" },
      error: null,
    });

    from.mockImplementation((table: string) => {
      if (table === "registrations") return registration;
      if (table === "profile_qr_credentials") return credential;
      throw new Error(`Unexpected table: ${table}`);
    });

    const response = await GET(request());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      qrPayload: "saved-private-qr",
    });
    expect(from).not.toHaveBeenCalledWith("public_profiles");
  });

  it("creates a QR credential against the registration when none exists", async () => {
    const registration = queryResult({ data: { id: 42 }, error: null });
    const credential = queryResult({ data: null, error: null });
    credential.insert.mockResolvedValue({ error: null });

    from.mockImplementation((table: string) => {
      if (table === "registrations") return registration;
      if (table === "profile_qr_credentials") return credential;
      throw new Error(`Unexpected table: ${table}`);
    });

    const response = await GET(request());
    const body = (await response.json()) as { qrPayload: string };

    expect(response.status).toBe(200);
    expect(body.qrPayload).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(credential.insert).toHaveBeenCalledWith({
      registration_id: 42,
      qr_secret: body.qrPayload,
    });
    expect(from).not.toHaveBeenCalledWith("public_profiles");
  });
});
