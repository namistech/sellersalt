import axios from "axios";
import { prisma } from "@/lib/db";
import { decryptProviderKey } from "@/lib/ai-providers";
import type { AssistantMessage } from "./types";
import type { AiProviderType } from "@prisma/client";

export interface LLMCallContext {
  organizationId: string;
  userRole: string;
  connectedShopName?: string | null;
  savedProspectCount?: number;
  trackedShopCount?: number;
}

export interface LLMProvider {
  name: string;
  generateResponse(
    prompt: string,
    context: LLMCallContext,
    conversationHistory?: Array<{ role: "user" | "assistant"; content: string }>
  ): Promise<AssistantMessage | null>;
}

function buildSystemPrompt(context: LLMCallContext): string {
  return `You are SellerSalt's AI E-Commerce Copilot — an expert Etsy intelligence assistant.
Your goal is to help Etsy sellers uncover high-demand, low-competition product opportunities, analyze competitor velocity, and optimize listing yield.

Current Workspace Context:
- Organization ID: ${context.organizationId}
- User Role: ${context.userRole}
- Connected Etsy Shop: ${context.connectedShopName || "None (disconnected)"}
- Tracked Competitor Shops: ${context.trackedShopCount || 0}
- Saved Opportunities: ${context.savedProspectCount || 0}

Guidelines:
1. Provide concise, data-driven, actionable recommendations for Etsy sellers.
2. Focus on metrics: Sales Velocity (est. daily sales), Listing Yield (sales/listing), and Competition Ratio (<100 reviews).
3. If the user asks to run searches or inspect opportunities, guide them directly to the Opportunity Radar (/radar), Prospects Hub (/prospects), or Competitor Spy (/spy).
4. Never invent fake Etsy API policies or fake guarantee of revenue.
5. Stay strictly within SellerSalt's domain — Etsy research, products, shops, keywords, competitors, planning, and listing optimization. If asked something outside that scope, say so plainly rather than answering anyway.`;
}

// Every one of these providers exposes an OpenAI-compatible chat completions
// endpoint, so one function handles all four rather than four near-duplicate
// blocks — the only per-provider differences are the base URL and headers.
const PROVIDER_CHAT_ENDPOINT: Record<AiProviderType, string> = {
  OPENROUTER: "https://openrouter.ai/api/v1/chat/completions",
  NVIDIA: "https://integrate.api.nvidia.com/v1/chat/completions",
  GEMINI: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
  OPENAI: "https://api.openai.com/v1/chat/completions",
};

function chatHeaders(provider: AiProviderType, apiKey: string): Record<string, string> {
  const base = { Authorization: `Bearer ${apiKey}` };
  if (provider === "OPENROUTER") {
    return { ...base, "HTTP-Referer": "https://sellersalt.com", "X-Title": "SellerSalt Assistant" };
  }
  return base;
}

async function callProvider(
  provider: AiProviderType,
  apiKey: string,
  modelId: string,
  messages: Array<{ role: string; content: string }>
): Promise<string | null> {
  const res = await axios.post(
    PROVIDER_CHAT_ENDPOINT[provider],
    { model: modelId, messages, temperature: 0.7, max_tokens: 600 },
    { headers: chatHeaders(provider, apiKey), timeout: 15000 }
  );
  return res.data?.choices?.[0]?.message?.content ?? null;
}

export class MultiProviderLLMService {
  async generateResponse(
    prompt: string,
    context: LLMCallContext,
    conversationHistory: Array<{ role: "user" | "assistant"; content: string }> = []
  ): Promise<AssistantMessage | null> {
    // Real, admin-configured routing — priority-ordered, active providers
    // only, each using whichever model was actually selected (auto-picked
    // on the last "Refresh Models", or explicitly chosen by an admin) —
    // never a model ID hardcoded in this file. A provider with no model
    // selected yet (never successfully refreshed) is skipped rather than
    // guessed at.
    const providers = await prisma.aiProvider.findMany({
      where: { isActive: true, encryptedApiKey: { not: null }, defaultModelId: { not: null } },
      orderBy: { priority: "asc" },
    });

    if (providers.length === 0) return null;

    const systemPrompt = buildSystemPrompt(context);
    const messages = [
      { role: "system", content: systemPrompt },
      ...conversationHistory.slice(-6).map((m) => ({ role: m.role, content: m.content })),
      { role: "user", content: prompt },
    ];

    for (const provider of providers) {
      const apiKey = decryptProviderKey(provider.encryptedApiKey);
      if (!apiKey || !provider.defaultModelId) continue;

      try {
        const text = await callProvider(provider.provider, apiKey, provider.defaultModelId, messages);
        if (text) {
          return {
            id: `ai_${Date.now()}`,
            sender: "assistant",
            text,
            intent: "HELP",
            timestamp: new Date().toISOString(),
          };
        }
      } catch (err: any) {
        console.warn(
          `${provider.provider} (model ${provider.defaultModelId}) call failed, trying next provider...`,
          err?.response?.data?.error?.message || err?.message
        );
      }
    }

    return null;
  }
}

export const multiProviderLLM = new MultiProviderLLMService();
