import { NextRequest } from "next/server";
import { verifyMessage } from "viem";

const MAX_CLOCK_SKEW_MS = 5 * 60 * 1000;

/**
 * Verifies a wallet-signed "Wallet Auth <timestamp>" header set, used by any
 * endpoint that needs to confirm the caller controls the claimed wallet
 * (not just that the wallet address string matches).
 */
export async function verifyWalletAuth(req: NextRequest): Promise<string | null> {
  const address = req.headers.get("x-wallet-address")?.toLowerCase();
  const signature = req.headers.get("x-wallet-signature");
  const timestamp = req.headers.get("x-wallet-timestamp");

  if (!address || !signature || !timestamp) return null;
  if (Date.now() - parseInt(timestamp) > MAX_CLOCK_SKEW_MS) return null;

  try {
    const ok = await verifyMessage({
      address: address as `0x${string}`,
      message: `Wallet Auth ${timestamp}`,
      signature: signature as `0x${string}`,
    });
    return ok ? address : null;
  } catch {
    return null;
  }
}
