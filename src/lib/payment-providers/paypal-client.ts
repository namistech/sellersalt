import axios from "axios";
import { getActivePaymentCredentials } from "./get-active-credentials";

// Direct REST calls rather than the SDK — PayPal's REST API is stable,
// extensively documented, and this matches the pattern already proven
// reliable for every other external integration in this codebase (Etsy,
// Shopify, WooCommerce all use direct HTTP calls, not vendor SDKs).

interface PaypalContext {
  baseUrl: string;
  accessToken: string;
}

export async function getPaypalContext(): Promise<PaypalContext | null> {
  const active = await getActivePaymentCredentials("PAYPAL");
  if (!active) return null;

  const clientId = active.credentials.clientId;
  const clientSecret = active.credentials.clientSecret;
  if (!clientId || !clientSecret) return null;

  const baseUrl = active.mode === "LIVE" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";

  const tokenRes = await axios.post(
    `${baseUrl}/v1/oauth2/token`,
    "grant_type=client_credentials",
    { auth: { username: clientId, password: clientSecret }, headers: { "Content-Type": "application/x-www-form-urlencoded" } }
  );

  return { baseUrl, accessToken: tokenRes.data.access_token };
}

export function paypalClient(ctx: PaypalContext) {
  return axios.create({
    baseURL: ctx.baseUrl,
    headers: { Authorization: `Bearer ${ctx.accessToken}`, "Content-Type": "application/json" },
    timeout: 15000,
  });
}
