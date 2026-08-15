import { NextResponse } from "next/server";
import { resolveEligibleProviders } from "@/services/billing/payment-router";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const country = url.searchParams.get("country") || undefined;
  const currency = url.searchParams.get("currency") || undefined;

  const providers = await resolveEligibleProviders({ country, currency });
  return NextResponse.json({ providers });
}
