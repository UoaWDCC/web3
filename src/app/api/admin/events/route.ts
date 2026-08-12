import { NextRequest, NextResponse } from "next/server";
import { verifyMessage } from "viem";
import { isAllowedAdminAddress } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/services/supabase-admin";

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

export async function GET(req: NextRequest) {
  const isAuth = await verifyAdminAuth(req);
  if (!isAuth)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("events")
      .select("id, title, start_time")
      .order("start_time", { ascending: false });

    if (error) throw error;

    return NextResponse.json({ events: data || [] });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json(
      { error: error.message || "Failed to load events" },
      { status: 500 },
    );
  }
}
