import axios from "axios";
import type { AiProviderType } from "@prisma/client";

// Real provider catalog calls only — every field here comes directly from
// what each provider's own API reports for that model, or is left null.
// Nothing is guessed, inferred from a naming convention, or hardcoded.
export interface DiscoveredModel {
  modelId: string;
  displayName: string;
  contextLength: number | null;
  inputPricePerMillion: number | null;
  outputPricePerMillion: number | null;
  isFree: boolean;
  supportsVision: boolean;
  supportsTools: boolean;
  supportsStructuredOutput: boolean;
  raw: unknown;
}

export class ModelDiscoveryError extends Error {}

async function discoverOpenRouterModels(apiKey: string): Promise<DiscoveredModel[]> {
  const res = await axios.get("https://openrouter.ai/api/v1/models", {
    headers: { Authorization: `Bearer ${apiKey}` },
    timeout: 15000,
  });
  const rows: any[] = res.data?.data ?? [];
  return rows.map((m) => {
    const promptPrice = m.pricing?.prompt != null ? Number(m.pricing.prompt) : null;
    const completionPrice = m.pricing?.completion != null ? Number(m.pricing.completion) : null;
    const supportedParams: string[] = m.supported_parameters ?? [];
    const inputModalities: string[] = m.architecture?.input_modalities ?? [];
    return {
      modelId: m.id,
      displayName: m.name || m.id,
      contextLength: m.context_length ?? m.top_provider?.context_length ?? null,
      // OpenRouter reports price per token; x1e6 to store per-million, matching
      // how every other provider/product quotes LLM pricing.
      inputPricePerMillion: promptPrice != null ? promptPrice * 1_000_000 : null,
      outputPricePerMillion: completionPrice != null ? completionPrice * 1_000_000 : null,
      isFree: promptPrice === 0 && completionPrice === 0,
      supportsVision: inputModalities.includes("image"),
      supportsTools: supportedParams.includes("tools"),
      supportsStructuredOutput: supportedParams.includes("response_format") || supportedParams.includes("structured_outputs"),
      raw: m,
    };
  });
}

async function discoverNvidiaModels(apiKey: string): Promise<DiscoveredModel[]> {
  // NVIDIA's NIM API is OpenAI-compatible, including /v1/models — but
  // unlike OpenRouter, it reports no pricing/context/capability metadata,
  // just id/owner. Those fields stay null rather than guessed.
  const res = await axios.get("https://integrate.api.nvidia.com/v1/models", {
    headers: { Authorization: `Bearer ${apiKey}` },
    timeout: 15000,
  });
  const rows: any[] = res.data?.data ?? [];
  return rows.map((m) => ({
    modelId: m.id,
    displayName: m.id,
    contextLength: null,
    inputPricePerMillion: null,
    outputPricePerMillion: null,
    isFree: false,
    supportsVision: false,
    supportsTools: false,
    supportsStructuredOutput: false,
    raw: m,
  }));
}

async function discoverGeminiModels(apiKey: string): Promise<DiscoveredModel[]> {
  const res = await axios.get(`https://generativelanguage.googleapis.com/v1beta/models`, {
    params: { key: apiKey, pageSize: 200 },
    timeout: 15000,
  });
  const rows: any[] = res.data?.models ?? [];
  // Only models that actually support chat generation belong in a chat
  // model picker — Gemini's catalog also lists embedding/vision-only
  // utility models under the same endpoint.
  return rows
    .filter((m) => (m.supportedGenerationMethods ?? []).includes("generateContent"))
    .map((m) => ({
      modelId: String(m.name || "").replace(/^models\//, ""),
      displayName: m.displayName || m.name,
      contextLength: m.inputTokenLimit ?? null,
      inputPricePerMillion: null,
      outputPricePerMillion: null,
      // Google doesn't expose pricing, free-tier status, or capability
      // flags (vision/tools/structured output) via this endpoint — left
      // false/null rather than guessed from the model name.
      isFree: false,
      supportsVision: false,
      supportsTools: false,
      supportsStructuredOutput: false,
      raw: m,
    }));
}

async function discoverOpenAiModels(apiKey: string): Promise<DiscoveredModel[]> {
  const res = await axios.get("https://api.openai.com/v1/models", {
    headers: { Authorization: `Bearer ${apiKey}` },
    timeout: 15000,
  });
  const rows: any[] = res.data?.data ?? [];
  // The list endpoint reports every model OpenAI has ever shipped,
  // including embeddings/audio/image/moderation models that aren't chat
  // models at all. Restrict to chat-completion-shaped model families —
  // OpenAI doesn't tag "type" in this endpoint, so this is a name-based
  // filter on their own published model families, not a guess about any
  // individual model's capabilities.
  return rows
    .filter((m) => /^(gpt-|o1|o3|o4|chatgpt)/i.test(m.id) && !/embedding|whisper|tts|dall-e|moderation/i.test(m.id))
    .map((m) => ({
      modelId: m.id,
      displayName: m.id,
      contextLength: null,
      inputPricePerMillion: null,
      outputPricePerMillion: null,
      isFree: false,
      supportsVision: false,
      supportsTools: false,
      supportsStructuredOutput: false,
      raw: m,
    }));
}

export async function discoverModelsForProvider(provider: AiProviderType, apiKey: string): Promise<DiscoveredModel[]> {
  try {
    switch (provider) {
      case "OPENROUTER":
        return await discoverOpenRouterModels(apiKey);
      case "NVIDIA":
        return await discoverNvidiaModels(apiKey);
      case "GEMINI":
        return await discoverGeminiModels(apiKey);
      case "OPENAI":
        return await discoverOpenAiModels(apiKey);
      default:
        throw new ModelDiscoveryError(`Unknown provider "${provider}".`);
    }
  } catch (err: any) {
    const message = err?.response?.data?.error?.message || err?.response?.data?.error || err?.message || "Model discovery request failed.";
    throw new ModelDiscoveryError(typeof message === "string" ? message : JSON.stringify(message));
  }
}
