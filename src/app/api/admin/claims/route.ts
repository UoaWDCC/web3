import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { verifyMessage } from "viem";
import { isAllowedAdminAddress } from "@/lib/admin-auth";

async function verifyAdminAuth(req: NextRequest) {
  const address = req.headers.get("x-admin-address")?.toLowerCase();
  const signature = req.headers.get("x-admin-signature");
  const timestamp = req.headers.get("x-admin-timestamp");

  if (!address || !signature || !timestamp) return false;
  if (!isAllowedAdminAddress(address)) return false;

  // Prevent replay attacks (valid for 5 mins)
  const now = Date.now();
  if (now - parseInt(timestamp) > 5 * 60 * 1000) return false;

  try {
    const valid = await verifyMessage({
      address: address as `0x${string}`,
      message: `Admin Auth ${timestamp}`,
      signature: signature as `0x${string}`,
    });
    return valid;
  } catch {
    return false;
  }
}

// GET all claims (filter by status)
export async function GET(req: NextRequest) {
  const isAuth = await verifyAdminAuth(req);
  if (!isAuth)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");

  
  try {
    const prisma = getPrisma();
    const claims = await prisma.claimRequest.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ claims });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch claims" },
      { status: 500 },
    );
  }
}

// Update claim status (Approve / Reject)
export async function PUT(req: NextRequest) {
  const isAuth = await verifyAdminAuth(req);
  if (!isAuth)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  
  try {
    const prisma = getPrisma(); 
    const body = await req.json();
    const { id, status } = body; // status can be "APPROVED", "REJECTED"

    const updated = await prisma.claimRequest.update({
      where: { id },
      data: { status },
    });

    return NextResponse.json({ claim: updated });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update claim" },
      { status: 500 },
    );
  }
}
