import { NextResponse } from "next/server";
import { extractBearerToken, resolveExtensionSessionToken } from "@/lib/extension-pairing";
import { getOrgPackage } from "@/lib/plan-limits";
import { PLAN_DEFINITIONS, PlanTierKey, getFeatureAccess } from "@/services/plans/plan-capabilities";

export async function GET(req: Request) {
  const token = extractBearerToken(req);
  if (!token) {
    return NextResponse.json({ error: "Missing bearer token." }, { status: 401 });
  }

  const identity = await resolveExtensionSessionToken(token);
  if (!identity) {
    return NextResponse.json({ error: "Session token is invalid or expired." }, { status: 401 });
  }

  const pkg = await getOrgPackage(identity.organizationId);
  const tierKey = (pkg.key as PlanTierKey) || "STARTED";
  const planDef = PLAN_DEFINITIONS[tierKey] || PLAN_DEFINITIONS.STARTED;
  const features = getFeatureAccess(tierKey);

  return NextResponse.json({
    organizationId: identity.organizationId,
    tier: tierKey,
    planName: planDef.name,
    limits: planDef.limits,
    features,
  });
}
