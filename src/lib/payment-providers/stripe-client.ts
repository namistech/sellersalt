import Stripe from "stripe";
import { getActivePaymentCredentials } from "./get-active-credentials";

export async function getStripeClient(): Promise<{ stripe: Stripe; mode: "LIVE" | "SANDBOX" } | null> {
  const active = await getActivePaymentCredentials("STRIPE");
  if (!active) return null;

  const secretKey = active.credentials.secretKey;
  if (!secretKey) return null;

  return { stripe: new Stripe(secretKey), mode: active.mode };
}

export async function getStripePublishableKey(): Promise<string | null> {
  const active = await getActivePaymentCredentials("STRIPE");
  return active?.credentials.publishableKey ?? null;
}
