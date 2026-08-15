import axios from "axios";
import crypto from "node:crypto";
import { getActivePaymentCredentials } from "./get-active-credentials";

export interface PayfastCredentials {
  merchantId?: string;
  securedKey?: string;
  currencyCode?: string;
}

export async function getPayfastContext(): Promise<{
  credentials: PayfastCredentials;
  baseUrl: string;
  mode: "LIVE" | "SANDBOX";
} | null> {
  const active = await getActivePaymentCredentials("PAYFAST");
  if (!active || !active.credentials) return null;

  const baseUrl =
    active.mode === "LIVE"
      ? "https://ipg.gopayfast.com/token/checkout"
      : "https://ipg.gopayfast.com/token/sandbox";

  return {
    credentials: active.credentials as PayfastCredentials,
    baseUrl,
    mode: active.mode,
  };
}

export async function createPayfastSession(params: {
  orderId: string;
  amount: number;
  customerEmail: string;
  customerName: string;
  customerMobile?: string;
  successUrl: string;
  cancelUrl: string;
}): Promise<{ url: string; token: string } | null> {
  const ctx = await getPayfastContext();
  if (!ctx) return null;

  const { merchantId, securedKey } = ctx.credentials;
  if (!merchantId || !securedKey) return null;

  try {
    const tokenPayload = {
      merchant_id: merchantId,
      secured_key: securedKey,
      basket_id: params.orderId,
      txnamt: params.amount.toFixed(2),
      customer_email_address: params.customerEmail,
      customer_mobile_no: params.customerMobile || "03000000000",
      return_url: params.successUrl,
      cancel_url: params.cancelUrl,
    };

    const res = await axios.post(`${ctx.baseUrl}/get_token`, tokenPayload, {
      headers: { "Content-Type": "application/json" },
      timeout: 10000,
    });

    const token = res.data?.token || res.data?.data?.token;
    if (!token) return null;

    const checkoutUrl = `${ctx.baseUrl}?token=${encodeURIComponent(token)}`;
    return { url: checkoutUrl, token };
  } catch (error: any) {
    console.error("PayFast session creation failed:", error?.response?.data ?? error.message);
    return null;
  }
}
