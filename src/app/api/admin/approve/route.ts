import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { setName } from "@/lib/namestone";
import { verifyMessage } from "viem";
import { isAllowedAdminAddress } from "@/lib/admin-auth";

async function verifyAdminAuth(req: NextRequest) {
  const address = req.headers.get("x-admin-address")?.toLowerCase();
  const signature = req.headers.get("x-admin-signature");
  const timestamp = req.headers.get("x-admin-timestamp");

  if (!address || !signature || !timestamp || !isAllowedAdminAddress(address))
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

export async function POST(req: NextRequest) {
  const isAuth = await verifyAdminAuth(req);
  if (!isAuth)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const prisma = getPrisma();
    const { claimId } = await req.json();

    const claim = await prisma.claimRequest.findUnique({
      where: { id: claimId },
    });
    if (!claim || claim.status !== "PENDING") {
      return NextResponse.json({ error: "Invalid claim" }, { status: 400 });
    }

    // Call NameStone
    await setName({
      domain: "web3uoa.eth",
      name: claim.requestedName,
      address: claim.walletAddress,
    });

    const updated = await prisma.claimRequest.update({
      where: { id: claimId },
      data: { status: "APPROVED" },
    });

    return NextResponse.json({ claim: updated });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json(
      { error: error.message || "Failed to approve" },
      { status: 500 },
    );
  }
}
