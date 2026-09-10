import { NextRequest, NextResponse } from "next/server";
import { EventService } from "@/services/event-service";
import { isAllowedAdminAddress } from "@/lib/admin-auth";
import { verifyMessage } from "viem";

async function verifyAdminAuth(req: NextRequest) {
  const address = req.headers.get("x-admin-address")?.toLowerCase();
  const signature = req.headers.get("x-admin-signature");
  const timestamp = req.headers.get("x-admin-timestamp");

  if (!address || !signature || !timestamp || !isAllowedAdminAddress(address))
    return false;

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

export async function POST(req: NextRequest) {
  const isAuth = await verifyAdminAuth(req);
  if (!isAuth)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const formData = await req.formData();
    const file = formData.get("image") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "Missing image file" },
        { status: 400 },
      );
    }

    const uploaded = await EventService.uploadEventImage(file);
    return NextResponse.json({
      event_path: uploaded.imagePath,
      event_url: uploaded.imageUrl,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Image upload failed" },
      { status: 500 },
    );
  }
}
