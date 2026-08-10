import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSettings } from "@/lib/app-settings";

// Any logged-in user can read these — they're just marketing links, not
// secrets. Client-side pages (like Connected Stores) call this instead of
// the admin-gated /api/admin/settings route.
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const values = await getSettings(["shopify_affiliate_url", "netdrix_shopify_order_url", "netdrix_woocommerce_order_url"]);
  return NextResponse.json({ settings: values });
}
