import { getSetting } from "@/lib/app-settings";
import type { AssistantMessage } from "./types";

export interface LLMProvider {
  isConfigured(): Promise<boolean>;
  generateResponse(
    prompt: string,
    context: {
      organizationId: string;
      systemContext: string;
    }
  ): Promise<AssistantMessage | null>;
}

/**
 * Fallback / Pluggable LLM Provider Stub
 * Architecture is prepared so when an API key is configured via AppSettings or environment,
 * external LLMs (e.g. OpenAI / Gemini) can be plugged in without refactoring the product.
 */
export class PluggableLLMProvider implements LLMProvider {
  async isConfigured(): Promise<boolean> {
    const key = (await getSetting("openai_api_key" as any)) || process.env.OPENAI_API_KEY;
    return Boolean(key && key.trim().length > 0);
  }

  async generateResponse(
    _prompt: string,
    _context: {
      organizationId: string;
      systemContext: string;
    }
  ): Promise<AssistantMessage | null> {
    // If no key configured, return null to cleanly fallback to deterministic engine
    if (!(await this.isConfigured())) {
      return null;
    }

    // Provider expansion point: external LLM completion logic can be attached here
    return null;
  }
}

export const llmProvider = new PluggableLLMProvider();
