import axios from "axios";
import { prisma } from "@/lib/db";
import { decryptProviderKey } from "@/lib/ai-providers";
import { evaluateListingOriginality } from "./originality-engine";
import { auditListingSeo } from "./seo-engine";
import type { AiProviderType } from "@prisma/client";
import type { ListingDraftPayload, ListingGenerationMetadata } from "@/types/listing-draft";
import type { OriginalityCheckResult } from "@/types/originality";
import type { CompleteListingSeoAudit } from "@/types/seo";

export interface ListingGenerationInput {
  conceptTitle: string;
  targetCategory?: string | null;
  taxonomyId?: number | null;
  targetPrice?: number | null;
  targetKeywords?: string[];
  productFacts?: string | null;
  materials?: string[];
  notes?: string | null;

  // Source inspiration to enforce originality protection against
  sourceTitle?: string | null;
  sourceDescription?: string | null;
  sourceTags?: string[];
}

export interface GeneratedListingResult {
  payload: ListingDraftPayload;
  originality: OriginalityCheckResult;
  seoAudit: CompleteListingSeoAudit;
  generationMetadata: ListingGenerationMetadata;
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
    return { ...base, "HTTP-Referer": "https://sellersalt.com", "X-Title": "SellerSalt Studio" };
  }
  return base;
}

/**
 * Sanitizes and repairs a generated Etsy title to satisfy hard constraints:
 * - Maximum 140 characters
 * - Front-loaded high intent
 */
export function sanitizeTitle(rawTitle: string, fallbackKeywords: string[] = []): string {
  let title = (rawTitle || "").replace(/[\r\n\t]+/g, " ").replace(/\s+/g, " ").trim();
  if (!title && fallbackKeywords.length > 0) {
    title = fallbackKeywords.slice(0, 4).join(" | ");
  }
  if (!title) {
    title = "Handmade Custom Product";
  }

  if (title.length > 140) {
    // Truncate at last word/pipe boundary before 140
    const sliced = title.slice(0, 140);
    const lastDelimiter = Math.max(sliced.lastIndexOf("|"), sliced.lastIndexOf(","), sliced.lastIndexOf(" - "), sliced.lastIndexOf(" "));
    if (lastDelimiter > 90) {
      title = sliced.slice(0, lastDelimiter).trim();
    } else {
      title = sliced.trim();
    }
  }
  return title;
}

/**
 * Sanitizes and repairs generated tags to satisfy hard constraints:
 * - Exactly 13 unique tags
 * - Each tag <= 20 characters
 * - No special punctuation
 */
export function sanitizeTags(rawTags: string[], targetKeywords: string[] = []): string[] {
  const cleanTags: string[] = [];
  const seen = new Set<string>();

  const candidates = [
    ...(Array.isArray(rawTags) ? rawTags : []),
    ...(Array.isArray(targetKeywords) ? targetKeywords : []),
    "handmade gift",
    "custom decor",
    "personalized gift",
    "unique keepsake",
    "artisan craft",
    "vintage style",
    "thoughtful present",
  ];

  for (let tag of candidates) {
    if (!tag || typeof tag !== "string") continue;
    // Lowercase and strip punctuation
    let cleaned = tag
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .replace(/\s+/g, " ")
      .trim();

    if (!cleaned) continue;

    // Hard ceiling: 20 characters
    if (cleaned.length > 20) {
      const words = cleaned.split(" ");
      let truncated = "";
      for (const w of words) {
        if ((truncated + " " + w).trim().length <= 20) {
          truncated = (truncated + " " + w).trim();
        } else {
          break;
        }
      }
      cleaned = truncated || cleaned.slice(0, 20).trim();
    }

    if (cleaned.length >= 2 && !seen.has(cleaned)) {
      seen.add(cleaned);
      cleanTags.push(cleaned);
    }

    if (cleanTags.length === 13) break;
  }

  // Ensure exactly 13 tags
  while (cleanTags.length < 13) {
    const filler = `gift idea ${cleanTags.length + 1}`;
    if (!seen.has(filler)) {
      seen.add(filler);
      cleanTags.push(filler);
    }
  }

  return cleanTags.slice(0, 13);
}

/**
 * Generates an original Etsy listing draft using configured AI routing.
 */
export async function generateOriginalListingDraft(
  input: ListingGenerationInput
): Promise<GeneratedListingResult> {
  let providers: any[] = [];
  try {
    providers = await prisma.aiProvider.findMany({
      where: { isActive: true, encryptedApiKey: { not: null }, defaultModelId: { not: null } },
      orderBy: { priority: "asc" },
    });
  } catch (err: any) {
    // Database or environment fallback
  }

  const prompt = `You are an expert Etsy SEO copywriter and e-commerce strategist.
Create an original, high-converting Etsy listing payload in valid JSON format based on this product concept:

PRODUCT STRATEGY & FACTS:
- Concept Title: ${input.conceptTitle}
- Target Category: ${input.targetCategory || "General Handmade"}
- Target Price: $${input.targetPrice ? input.targetPrice.toFixed(2) : "25.00"}
- Target Keywords: ${(input.targetKeywords || []).join(", ") || "None specified"}
- Product Facts & Materials: ${input.productFacts || (input.materials || []).join(", ") || "Handmade artisan craft"}
- Strategic Notes: ${input.notes || "None"}

MANDATORY ETSY CONSTRAINTS:
1. "title": Maximum 140 characters. Front-load primary high-intent search terms in the first 40 characters. Use clean "|" or "," delimiters.
2. "tags": Exactly 13 tags as a JSON array of strings. Each tag MUST be <= 20 characters. All lowercase. No special characters or punctuation. Every tag must be a multi-word long-tail phrase.
3. "description": Professional structured listing copy:
   - Immediate value proposition hook in first 160 characters
   - Key Features & Specifications (bullet points)
   - What's Included / Sizing
   - How to Order / Care Instructions
   - Shop Policies summary
4. "materials": Array of strings (only using confirmed materials: ${(input.materials || []).join(", ") || "Handmade materials"}).
5. "price": ${input.targetPrice || 25.0}
6. "quantity": 999

CRITICAL ORIGINALITY INSTRUCTION:
DO NOT COPY or plagiarize any competitor text. Create 100% original copy with unique phrasing.

Return ONLY valid JSON matching this exact structure:
{
  "title": "...",
  "tags": ["...", "..."],
  "description": "...",
  "materials": ["..."],
  "price": 25.0,
  "quantity": 999
}`;

  let rawJson: any = null;
  let usedProvider = "DEFAULT_FALLBACK";
  let usedModel = "rule-based-generator";

  // Try AI providers in priority order
  for (const provider of providers) {
    const apiKey = decryptProviderKey(provider.encryptedApiKey);
    if (!apiKey || !provider.defaultModelId) continue;

    try {
      const res = await axios.post(
        PROVIDER_CHAT_ENDPOINT[provider.provider as AiProviderType],
        {
          model: provider.defaultModelId,
          messages: [
            { role: "system", content: "You are a professional Etsy listing copywriter. Always output valid JSON only." },
            { role: "user", content: prompt },
          ],
          temperature: 0.7,
          max_tokens: 1500,
          response_format: { type: "json_object" },
        },
        { headers: chatHeaders(provider.provider, apiKey), timeout: 25000 }
      );

      const content = res.data?.choices?.[0]?.message?.content;
      if (content) {
        // Parse JSON
        const parsed = JSON.parse(content.replace(/```json/g, "").replace(/```/g, "").trim());
        if (parsed.title && Array.isArray(parsed.tags) && parsed.description) {
          rawJson = parsed;
          usedProvider = provider.provider;
          usedModel = provider.defaultModelId;
          break;
        }
      }
    } catch (err: any) {
      console.warn(`[AI Listing Gen] Provider ${provider.provider} failed, falling back...`, err.message);
    }
  }

  // Fallback if no LLM provider responded
  if (!rawJson) {
    const fallbackTitle = sanitizeTitle(input.conceptTitle, input.targetKeywords);
    const fallbackTags = sanitizeTags(input.targetKeywords || [], input.targetKeywords);
    rawJson = {
      title: fallbackTitle,
      tags: fallbackTags,
      description: `${input.conceptTitle}\n\nHandcrafted with meticulous attention to detail. Designed for everyday utility and timeless aesthetics.\n\nKey Features:\n- Premium quality handcrafted finish\n- Durable and lightweight\n- Perfect for gifts and personal use\n\nCare Instructions:\nWipe clean with a soft dry cloth.`,
      materials: input.materials && input.materials.length > 0 ? input.materials : ["Handmade Craft Materials"],
      price: input.targetPrice || 25.0,
      quantity: 999,
    };
  }

  // Deterministic validation & repair
  const title = sanitizeTitle(rawJson.title, input.targetKeywords);
  const tags = sanitizeTags(rawJson.tags, input.targetKeywords);
  const description = String(rawJson.description || "").trim();
  const materials = Array.isArray(rawJson.materials) ? rawJson.materials.map(String).filter(Boolean) : [];
  const price = typeof rawJson.price === "number" ? rawJson.price : input.targetPrice || 25.0;
  const quantity = typeof rawJson.quantity === "number" ? rawJson.quantity : 999;

  const payload: ListingDraftPayload = {
    title,
    tags,
    description,
    materials,
    price,
    quantity,
    taxonomyId: input.taxonomyId || undefined,
    whoMade: "i_did",
    whenMade: "2020_2026",
    isSupply: false,
    isCustomizable: false,
    state: "draft",
  };

  // Originality Check
  const originality = evaluateListingOriginality({
    draftTitle: title,
    draftDescription: description,
    draftTags: tags,
    sourceTitle: input.sourceTitle || undefined,
    sourceDescription: input.sourceDescription || undefined,
    sourceTags: input.sourceTags || undefined,
  });

  // SEO Diagnostic Audit (Phase G)
  const seoAudit = auditListingSeo({
    title,
    tags,
    description,
    materials,
    categoryPath: input.targetCategory || undefined,
  });

  const generationMetadata: ListingGenerationMetadata = {
    provider: usedProvider,
    modelId: usedModel,
    generatedAt: new Date().toISOString(),
  };

  return {
    payload,
    originality,
    seoAudit,
    generationMetadata,
  };
}
