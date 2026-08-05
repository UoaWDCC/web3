import { NextRequest, NextResponse } from "next/server";
import { verifyMessage } from "viem";
import { isAllowedAdminAddress } from "@/lib/admin-auth";
import { createAdminSessionToken } from "@/lib/admin-session-server";

export async function POST(req: NextRequest) {
  try {
    const address = req.headers.get("x-admin-address")?.toLowerCase();
    const signature = req.headers.get("x-admin-signature");
    const timestamp = req.headers.get("x-admin-timestamp");

    if (!address || !signature || !timestamp) {
      return NextResponse.json(
        { error: "Missing auth headers" },
        { status: 400 },
      );
    }

    if (!isAllowedAdminAddress(address)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Keep the initial short-lived signed-message check (5 minutes)
    const now = Date.now();
    if (now - parseInt(timestamp) > 5 * 60 * 1000) {
      return NextResponse.json({ error: "Signature expired" }, { status: 401 });
    }

    try {
      const valid = await verifyMessage({
        address: address as `0x${string}`,
        message: `Admin Auth ${timestamp}`,
        signature: signature as `0x${string}`,
      });

      if (!valid)
        return NextResponse.json(
          { error: "Invalid signature" },
          { status: 401 },
        );

      // Create session token and set cookie
      const token = createAdminSessionToken(address);
      const res = NextResponse.json({ success: true });
      // set HttpOnly cookie for same-site access
      res.cookies.set("admin_session", token, {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24, // 1 day
      });

      return res;
    } catch (e) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed" },
      { status: 500 },
    );
  }
}
