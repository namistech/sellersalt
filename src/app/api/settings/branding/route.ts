import { NextResponse } from "next/server";
import { getSettings } from "@/lib/app-settings";

// Public route: provides branding, logo, favicon, and SEO configurations
export async function GET() {
  const values = await getSettings([
    "app_name",
    "app_logo_url",
    "app_favicon_url",
    "seo_default_title",
    "seo_default_description",
    "seo_og_image_url",
    "auth_page_logo_url",
    "auth_page_image_url",
    "support_email",
  ]);

  return NextResponse.json({ settings: values });
}
