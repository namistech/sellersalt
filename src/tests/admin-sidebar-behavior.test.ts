import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

test("Admin Sidebar: Component exports AdminSidebar with sticky, collapsible, and tooltip support", () => {
  const sidebarFile = fs.readFileSync(
    path.join(process.cwd(), "src/app/(dashboard)/admin/components/AdminSidebar.tsx"),
    "utf-8"
  );

  // 1. Sticky positioning verification
  assert.ok(sidebarFile.includes("lg:sticky"), "AdminSidebar must have lg:sticky positioning");
  assert.ok(sidebarFile.includes("lg:top-6"), "AdminSidebar must have top offset for sticky placement");
  assert.ok(sidebarFile.includes("overflow-y-auto"), "AdminSidebar must handle scroll overflow");

  // 2. Collapsible state default & width transitions
  assert.ok(sidebarFile.includes("useState(true)"), "AdminSidebar must default to auto-collapsed (true)");
  assert.ok(sidebarFile.includes('w-[68px]'), "AdminSidebar must support compact 68px collapsed width");
  assert.ok(sidebarFile.includes('w-64'), "AdminSidebar must support 256px expanded width");

  // 3. Toggle controls
  assert.ok(sidebarFile.includes("ChevronsRight"), "AdminSidebar must have expand toggle icon");
  assert.ok(sidebarFile.includes("ChevronsLeft"), "AdminSidebar must have collapse toggle icon");
  assert.ok(sidebarFile.includes("createPortal"), "AdminSidebar must render tooltips in portal to avoid scroll clipping");
});
