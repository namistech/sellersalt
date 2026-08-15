import axios from "axios";
import { getSetting } from "@/lib/app-settings";
import type { AssistantMessage } from "./types";

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
4. Never invent fake Etsy API policies or fake guarantee of revenue.`;
}

export class MultiProviderLLMService {
  private async getProviderKeys() {
    const [openRouterKey, nvidiaKey, geminiKey, openAiKey] = await Promise.all([
      getSetting("openrouter_api_key").then((v) => v || process.env.OPENROUTER_API_KEY),
      getSetting("nvidia_api_key").then((v) => v || process.env.NVIDIA_API_KEY),
      getSetting("gemini_api_key").then((v) => v || process.env.GEMINI_API_KEY),
      getSetting("openai_api_key").then((v) => v || process.env.OPENAI_API_KEY),
    ]);

    return { openRouterKey, nvidiaKey, geminiKey, openAiKey };
  }

  async generateResponse(
    prompt: string,
    context: LLMCallContext,
    conversationHistory: Array<{ role: "user" | "assistant"; content: string }> = []
  ): Promise<AssistantMessage | null> {
    const keys = await this.getProviderKeys();
    const systemPrompt = buildSystemPrompt(context);

    const messages = [
      { role: "system", content: systemPrompt },
      ...conversationHistory.slice(-6).map((m) => ({ role: m.role, content: m.content })),
      { role: "user", content: prompt },
    ];

    // Priority 1: OpenRouter
    if (keys.openRouterKey) {
      try {
        const res = await axios.post(
          "https://openrouter.ai/api/v1/chat/completions",
          {
            model: "google/gemini-2.0-flash-lite-preview-02-05:free",
            messages,
            temperature: 0.7,
            max_tokens: 600,
          },
          {
            headers: {
              Authorization: `Bearer ${keys.openRouterKey}`,
              "HTTP-Referer": "https://sellersalt.com",
              "X-Title": "SellerSalt Assistant",
            },
            timeout: 10000,
          }
        );
        const text = res.data.choices?.[0]?.message?.content;
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
        console.warn("OpenRouter provider call failed or rate-limited, falling back...", err?.message);
      }
    }

    // Priority 2: NVIDIA API
    if (keys.nvidiaKey) {
      try {
        const res = await axios.post(
          "https://integrate.api.nvidia.com/v1/chat/completions",
          {
            model: "meta/llama-3.3-70b-instruct",
            messages,
            temperature: 0.7,
            max_tokens: 600,
          },
          {
            headers: { Authorization: `Bearer ${keys.nvidiaKey}` },
            timeout: 10000,
          }
        );
        const text = res.data.choices?.[0]?.message?.content;
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
        console.warn("NVIDIA provider call failed, falling back...", err?.message);
      }
    }

    // Priority 3: Google Gemini API (OpenAI-compatible endpoint)
    if (keys.geminiKey) {
      try {
        const res = await axios.post(
          `https://generativelanguage.googleapis.com/v1beta/openai/chat/completions`,
          {
            model: "gemini-1.5-flash",
            messages,
            temperature: 0.7,
            max_tokens: 600,
          },
          {
            headers: {
              Authorization: `Bearer ${keys.geminiKey}`,
            },
            timeout: 10000,
          }
        );
        const text = res.data.choices?.[0]?.message?.content;
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
        console.warn("Gemini provider call failed, falling back...", err?.message);
      }
    }

    // Priority 4: OpenAI (fallback)
    if (keys.openAiKey) {
      try {
        const res = await axios.post(
          "https://api.openai.com/v1/chat/completions",
          {
            model: "gpt-4o-mini",
            messages,
            temperature: 0.7,
            max_tokens: 600,
          },
          {
            headers: { Authorization: `Bearer ${keys.openAiKey}` },
            timeout: 10000,
          }
        );
        const text = res.data.choices?.[0]?.message?.content;
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
        console.warn("OpenAI fallback failed...", err?.message);
      }
    }

    return null;
  }
}

export const multiProviderLLM = new MultiProviderLLMService();
