import test from "node:test";
import assert from "node:assert/strict";
import { SETTING_DEFINITIONS } from "../lib/app-settings";

test("Image Display & Spacing Controls: Setting definitions include all required display keys", () => {
  const keys = new Set(SETTING_DEFINITIONS.map((s) => s.key));

  // Spacing & Margins
  assert.ok(keys.has("auth_page_image_margin_top"), "missing auth_page_image_margin_top");
  assert.ok(keys.has("auth_page_image_margin_bottom"), "missing auth_page_image_margin_bottom");
  assert.ok(keys.has("auth_page_image_margin_left"), "missing auth_page_image_margin_left");
  assert.ok(keys.has("auth_page_image_margin_right"), "missing auth_page_image_margin_right");

  // Padding & Insets
  assert.ok(keys.has("auth_page_image_padding_top"), "missing auth_page_image_padding_top");
  assert.ok(keys.has("auth_page_image_padding_bottom"), "missing auth_page_image_padding_bottom");
  assert.ok(keys.has("auth_page_image_padding_left"), "missing auth_page_image_padding_left");
  assert.ok(keys.has("auth_page_image_padding_right"), "missing auth_page_image_padding_right");

  // Frame Dimensions & Positioning
  assert.ok(keys.has("auth_page_image_alignment"), "missing auth_page_image_alignment");
  assert.ok(keys.has("auth_page_image_fit"), "missing auth_page_image_fit");
  assert.ok(keys.has("auth_page_image_width"), "missing auth_page_image_width");
  assert.ok(keys.has("auth_page_image_height"), "missing auth_page_image_height");
  assert.ok(keys.has("auth_page_image_border_radius"), "missing auth_page_image_border_radius");
  assert.ok(keys.has("auth_page_image_bg_color"), "missing auth_page_image_bg_color");
});
