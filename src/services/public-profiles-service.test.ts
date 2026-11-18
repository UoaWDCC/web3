import { beforeEach, describe, expect, it, vi } from "vitest";

const { rpc } = vi.hoisted(() => ({
  rpc: vi.fn(),
}));

vi.mock("./supabase", () => ({
  getSupabase: () => ({ rpc }),
}));

import { PublicProfilesService } from "./public-profiles-service";

describe("PublicProfilesService.search", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    rpc.mockResolvedValue({ data: [], error: null });
  });

  it("does not exclude a profile when no wallet is connected", async () => {
    await PublicProfilesService.search("Vyomesh Jamwal");

    expect(rpc).toHaveBeenCalledWith("search_public_profiles", {
      search_query: "Vyomesh Jamwal",
      max_results: 8,
      excluded_wallet: null,
    });
  });

  it("normalizes and excludes the connected wallet", async () => {
    await PublicProfilesService.search(
      "  Vyomesh   Jamwal  ",
      8,
      "  0xABCDEFabcdefABCDEFabcdefABCDEFabcdefABCD  ",
    );

    expect(rpc).toHaveBeenCalledWith("search_public_profiles", {
      search_query: "Vyomesh Jamwal",
      max_results: 8,
      excluded_wallet: "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
    });
  });
});
