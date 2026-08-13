import { NextResponse } from "next/server";
import { getSettings } from "@/lib/app-settings";

// Deliberately no auth check — this is needed on the login/signup pages,
// before anyone has a session. Only exposes non-secret branding URLs.
export async function GET() {
  const values = await getSettings(["auth_page_logo_url", "auth_page_image_url"]);
  return NextResponse.json({ settings: values });
}
