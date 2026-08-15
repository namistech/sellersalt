import axios from "axios";
import { getActivePaymentCredentials } from "./get-active-credentials";

export interface SafepayCredentials {
  apiKey?: string;
  secretKey?: string;
  webhookSecret?: string;
  merchantId?: string;
}

export async function getSafepayContext(): Promise<{
  credentials: SafepayCredentials;
  baseUrl: string;
  mode: "LIVE" | "SANDBOX";
} | null> {
  const active = await getActivePaymentCredentials("SAFEPAY");
  if (!active || !active.credentials) return null;

  const baseUrl =
    active.mode === "LIVE"
      ? "https://api.getsafepay.com"
      : "https://sandbox.api.getsafepay.com";

  return {
    credentials: active.credentials as SafepayCredentials,
    baseUrl,
    mode: active.mode,
  };
}

export async function createSafepayCheckoutSession(params: {
  amount: number;
  currency: string;
  orderId: string;
  customerEmail: string;
  customerName?: string;
  successUrl: string;
  cancelUrl: string;
}): Promise<{ url: string; token: string } | null> {
  const ctx = await getSafepayContext();
  if (!ctx) return null;

  const { apiKey, secretKey } = ctx.credentials;
  if (!apiKey) return null;

  try {
    const res = await axios.post(
      `${ctx.baseUrl}/order/v1/init`,
      {
        client: apiKey,
        amount: params.amount,
        currency: params.currency.toUpperCase(),
        environment: ctx.mode.toLowerCase(),
      },
      {
        headers: { "Content-Type": "application/json" },
        timeout: 10000,
      }
    );

    const trackerToken = res.data?.data?.token || res.data?.token;
    if (!trackerToken) return null;

    const checkoutBaseUrl =
      ctx.mode === "LIVE"
        ? "https://getsafepay.com/checkout"
        : "https://sandbox.getsafepay.com/checkout";

    const checkoutUrl = `${checkoutBaseUrl}?beacon=${trackerToken}&source=custom&order_id=${encodeURIComponent(
      params.orderId
    )}&redirect_url=${encodeURIComponent(params.successUrl)}&cancel_url=${encodeURIComponent(
      params.cancelUrl
    )}`;

    return { url: checkoutUrl, token: trackerToken };
  } catch (error: any) {
    console.error("Safepay session creation failed:", error?.response?.data ?? error.message);
    return null;
  }
}
