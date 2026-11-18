import { NextRequest, NextResponse } from "next/server";
import { isAdminAddress } from "@/lib/admin-auth-server";

// Unauthenticated on purpose — this only decides whether to show the "Admin
// Panel" nav link. It grants no access; every actual admin action still
// requires the full signed-message check in its own route.
export async function GET(req: NextRequest) {
  const address = req.nextUrl.searchParams.get("address");
  const isAdmin = await isAdminAddress(address);
  return NextResponse.json({ isAdmin });
}
