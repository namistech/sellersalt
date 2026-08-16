import axios from "axios";
import { prisma } from "@/lib/db";
import { decryptProviderKey } from "@/lib/ai-providers";
import { TOOL_REGISTRY, type SaltBotContext, type ToolExecutionResult } from "./tool-registry";
import type { AssistantMessage } from "./types";
import type { AiProviderType } from "@prisma/client";

export interface LLMCallContext extends SaltBotContext {
  connectedShopName?: string | null;
  savedProspectCount?: number;
  trackedShopCount?: number;
  pendingPlannerItemCount?: number;
}

function buildSystemPrompt(context: LLMCallContext): string {
  const toolsSummary = Object.values(TOOL_REGISTRY)
    .map((t) => `- ${t.name}: ${t.description} Parameters: ${JSON.stringify(t.parameters.properties)}`)
    .join("\n");

  return `You are SaltBot, SellerSalt's canonical AI E-Commerce Copilot for Etsy market intelligence.
Your role is to orchestrate domain tools, analyze marketplace opportunities, evaluate competitor velocity, audit SEO, and assist Etsy sellers.

CURRENT WORKSPACE CONTEXT:
- Organization ID: ${context.organizationId}
- User Role: ${context.userRole || "OWNER"}
- Connected Shop: ${context.connectedShopName || "None (disconnected)"}
- Tracked Competitor Shops: ${context.trackedShopCount || 0}
- Saved Opportunities: ${context.savedProspectCount || 0}
- Pending Planner Items: ${context.pendingPlannerItemCount || 0}

AVAILABLE DOMAIN TOOLS:
${toolsSummary}

STRICT OPERATIONAL RULES:
1. Tool Invocation Format:
   If the user asks to search products, research a shop, check categories, search keywords, audit SEO, draft a listing, inspect tracked competitors, or add to planner, respond ONLY with a JSON object:
   {"tool": "<tool_name>", "params": { ... }}
2. Domain Grounding:
   Never invent fake metrics, per-listing sales, or imaginary Etsy API capabilities.
   Always respect data provenance: [ACTUAL ETSY DATA], [ESTIMATED], [SELLERSALT SCORE], [EXTERNAL DATA].
3. Out of Scope:
   If the user asks general world history, non-Etsy coding, medical/tax advice, say:
   "I am SellerSalt's AI Copilot, specialized exclusively in Etsy market intelligence, product research, SEO optimization, and listing creation. Your question is outside my domain. How can I help you discover or optimize an Etsy product today?"
4. No Silent Publishing:
   Etsy listing generation always creates a DRAFT requiring human review. Never promise immediate live activation.`;
}

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
    { model: modelId, messages, temperature: 0.2, max_tokens: 800 },
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
    let providers: any[] = [];
    try {
      providers = await prisma.aiProvider.findMany({
        where: { isActive: true, encryptedApiKey: { not: null }, defaultModelId: { not: null } },
        orderBy: { priority: "asc" },
      });
    } catch {
      providers = [];
    }

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
        const rawOutput = await callProvider(provider.provider, apiKey, provider.defaultModelId, messages);
        if (!rawOutput) continue;

        // Check if model returned a structured tool call
        const trimmed = rawOutput.trim();
        if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
          try {
            const parsed = JSON.parse(trimmed);
            if (parsed.tool && TOOL_REGISTRY[parsed.tool]) {
              const tool = TOOL_REGISTRY[parsed.tool];
              const result: ToolExecutionResult = await tool.handler(parsed.params || {}, context);

              return {
                id: `asst_${Date.now()}`,
                sender: "assistant",
                text: result.summary,
                intent: "HELP",
                timestamp: new Date().toISOString(),
                provenance: result.provenance,
                cards: result.cards,
                actions: result.actions,
                toolCall: {
                  toolName: tool.name,
                  params: parsed.params,
                  summary: result.summary,
                },
              };
            }
          } catch {}
        }

        // Direct text response
        return {
          id: `asst_${Date.now()}`,
          sender: "assistant",
          text: rawOutput,
          intent: "HELP",
          timestamp: new Date().toISOString(),
        };
      } catch (err: any) {
        console.warn(
          `Provider ${provider.provider} (${provider.defaultModelId}) call failed, trying next provider...`,
          err?.response?.data?.error?.message || err?.message
        );
      }
    }

    return null;
  }
}

export const multiProviderLLM = new MultiProviderLLMService();
