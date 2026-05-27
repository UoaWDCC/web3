import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const address = searchParams.get("address");

  if (!address) {
    return NextResponse.json({ error: "Address is required" }, { status: 400 });
  }


  try {
    const prisma = getPrisma();
    const claims = await prisma.claimRequest.findMany({
      where: {
        walletAddress: address.toLowerCase(),
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ claims });
  } catch (error: any) {
    console.error("Database error in GET /api/claims:", error);
    const message =
      error?.code === "P2021"
        ? "Database schema is not initialized (ClaimRequest table missing)."
        : error?.message || "Failed to fetch claims";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {

  try {
    const prisma = getPrisma();
    const body = await req.json();
    const { walletAddress, requestedName } = body;
    const normalizedWalletAddress = walletAddress?.toLowerCase();
    const normalizedRequestedName = requestedName?.toLowerCase();

    if (!walletAddress || !requestedName) {
      return NextResponse.json(
        { error: "walletAddress and requestedName are required" },
        { status: 400 },
      );
    }

    // Prevent assigning a subname that already belongs to someone.
    const existingApprovedName = await prisma.claimRequest.findFirst({
      where: {
        requestedName: normalizedRequestedName,
        status: "APPROVED",
      },
    });

    if (existingApprovedName) {
      return NextResponse.json(
        {
          error: "That subname is already assigned.",
        },
        { status: 400 },
      );
    }

    // Check if they already have an approved or pending claim
    try {
      const existing = await prisma.claimRequest.findFirst({
        where: {
          walletAddress: normalizedWalletAddress,
          status: { in: ["PENDING", "APPROVED"] },
        },
      });

      if (existing) {
        return NextResponse.json(
          { error: `You already have a ${existing.status} claim.` },
          { status: 400 },
        );
      }
    } catch (dbError: any) {
      console.error("Database error in findFirst:", dbError);
      if (dbError?.code === "P2021") {
        return NextResponse.json(
          {
            error:
              "Database schema is not initialized (ClaimRequest table missing).",
          },
          { status: 500 },
        );
      }
      return NextResponse.json(
        {
          error:
            dbError?.message ||
            "Database error: unable to check existing claims",
        },
        { status: 500 },
      );
    }

    // Create the claim
    try {
      const claim = await prisma.claimRequest.create({
        data: {
          walletAddress: normalizedWalletAddress,
          requestedName: normalizedRequestedName,
        },
      });

      return NextResponse.json({ claim }, { status: 201 });
    } catch (createError: any) {
      console.error("Database error in create:", createError);
      if (createError.code === "P2002") {
        return NextResponse.json(
          { error: "You already have a request with this status." },
          { status: 400 },
        );
      }
      return NextResponse.json(
        { error: `Database error: ${createError.message}` },
        { status: 500 },
      );
    }
  } catch (error: any) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: `API error: ${error.message}` },
      { status: 500 },
    );
  }
}
