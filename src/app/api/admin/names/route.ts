import { NextRequest, NextResponse } from "next/server";
import { getNames } from "@/lib/namestone";
import { verifyMessage } from "viem";
import { isAdminAddress } from "@/lib/admin-auth-server";

async function verifyAdminAuth(req: NextRequest) {
  const address = req.headers.get("x-admin-address")?.toLowerCase();
  const signature = req.headers.get("x-admin-signature");
  const timestamp = req.headers.get("x-admin-timestamp");

  if (!address || !signature || !timestamp || !(await isAdminAddress(address)))
    return false;
  if (Date.now() - parseInt(timestamp) > 5 * 60 * 1000) return false;

  try {
    return await verifyMessage({
      address: address as `0x${string}`,
      message: `Admin Auth ${timestamp}`,
      signature: signature as `0x${string}`,
    });
  } catch {
    return false;
  }
}

export async function GET(req: NextRequest) {
  const isAuth = await verifyAdminAuth(req);
  if (!isAuth)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const names = await getNames("web3uoa.eth");
    return NextResponse.json(names);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch names" },
      { status: 500 },
    );
  }
}
