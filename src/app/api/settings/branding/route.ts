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
    "auth_page_image_position_x",
    "auth_page_image_position_y",
    "auth_page_image_margin_top",
    "auth_page_image_margin_bottom",
    "auth_page_image_margin_left",
    "auth_page_image_margin_right",
    "auth_page_image_padding_top",
    "auth_page_image_padding_bottom",
    "auth_page_image_padding_left",
    "auth_page_image_padding_right",
    "auth_page_image_alignment",
    "auth_page_image_fit",
    "auth_page_image_width",
    "auth_page_image_height",
    "auth_page_image_border_radius",
    "auth_page_image_bg_color",
    "support_email",
  ]);

  return NextResponse.json({ settings: values });
}
