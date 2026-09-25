import { NextRequest, NextResponse } from "next/server";
import { verifyMessage } from "viem";
import { isAllowedAdminAddress } from "@/lib/admin-auth";
import BadgesService from "@/services/badges/badges-service";
import { getSupabaseAdmin } from "@/services/supabase-admin";

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

// POST - upload a badge image, returning the public URL to save as imageurl
export async function POST(req: NextRequest) {
  const isAuth = await verifyAdminAuth(req);
  if (!isAuth)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const formData = await req.formData();
    const file = formData.get("image");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Missing image file" },
        { status: 400 },
      );
    }

    // Unlike the events bucket, the badges bucket has no MIME restriction of
    // its own, so this is the only thing keeping non-images out of it.
    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "Badge image must be an image file" },
        { status: 400 },
      );
    }

    const uploaded = await new BadgesService(
      getSupabaseAdmin(),
    ).uploadBadgeImage(file);

    return NextResponse.json({
      image_path: uploaded.imagePath,
      imageurl: uploaded.imageUrl,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: message || "Image upload failed" },
      { status: 500 },
    );
  }
}
