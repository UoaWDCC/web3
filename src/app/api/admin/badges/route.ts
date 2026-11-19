import { NextRequest, NextResponse } from "next/server";
import { verifyMessage } from "viem";
import { z } from "zod";
import { isAllowedAdminAddress } from "@/lib/admin-auth";
import BadgesService from "@/services/badges/badges-service";
import { getSupabaseAdmin } from "@/services/supabase-admin";

// Postgres errors caused by the request's data rather than the server:
// foreign key (e.g. an eventid with no matching event) and check constraints.
const CLIENT_ERROR_CODES = new Set(["23503", "23514"]);

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

// POST - create a badge. The body is validated by badgeInsertSchema, which
// also enforces that an EVENT badge carries an eventid.
export async function POST(req: NextRequest) {
  const isAuth = await verifyAdminAuth(req);
  if (!isAuth)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Request body must be a JSON object" },
        { status: 400 },
      );
    }

    const badge = await new BadgesService(getSupabaseAdmin()).createBadge(body);
    return NextResponse.json({ badge });
  } catch (err: unknown) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: err.issues.map((issue) => issue.message).join("; ") },
        { status: 400 },
      );
    }

    const code = (err as { code?: string } | null)?.code;
    const message =
      (err as { message?: string } | null)?.message || "Failed to create badge";

    return NextResponse.json(
      { error: message },
      { status: code && CLIENT_ERROR_CODES.has(code) ? 400 : 500 },
    );
  }
}
