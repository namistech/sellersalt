import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isAdminEmail } from "@/lib/is-admin";
import { SETTING_DEFINITIONS, setSetting, type SettingKey } from "@/lib/app-settings";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  return isAdminEmail(session?.user?.email);
}

export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const rows = await prisma.appSetting.findMany();
  const byKey = new Map<string, { value: string; updatedAt: Date }>(
    rows.map((r: any) => [r.key, r])
  );

  return NextResponse.json({
    settings: SETTING_DEFINITIONS.map((def) => {
      const row = byKey.get(def.key);
      return {
        key: def.key,
        label: def.label,
        isSecret: def.isSecret,
        hasValue: Boolean(row),
        // Secrets are never sent to the client, not even encrypted — only
        // whether one is set. Non-secrets (links/IDs) are fine to show plainly.
        value: def.isSecret ? undefined : row?.value ?? "",
        updatedAt: row?.updatedAt ?? null,
      };
    }),
  });
}

export async function POST(req: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const { key, value } = body as { key: string; value: string };

  if (!SETTING_DEFINITIONS.some((d) => d.key === key)) {
    return NextResponse.json({ error: `Unknown setting "${key}".` }, { status: 400 });
  }
  if (typeof value !== "string" || !value.trim()) {
    return NextResponse.json({ error: "value is required." }, { status: 400 });
  }

  await setSetting(key as SettingKey, value.trim());
  return NextResponse.json({ ok: true });
}

// The admin UI saves individual settings via PATCH (update semantics fit
// better than POST for a single-field edit) — same upsert-by-key handler.
export { POST as PATCH };
