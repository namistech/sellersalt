# SellerSalt — Dynamic AI Model Routing & Catalog Management

- **Document Version:** 2.0.0
- **Status:** Canonical Specification
- **System Classification:** Multi-Provider LLM Infrastructure & Resiliency

---

## 1. Executive Purpose & The Anti-Hardcoding Architecture

Early AI implementations suffered from critical failure modes where static model identifiers (e.g. `gemini-1.5-flash` or specific OpenRouter free slugs) were hardcoded in application code. When providers deprecated models or modified model slugs, AI features failed silently without admin visibility.

SellerSalt enforces a **Dynamic Model Registry & Intelligent Routing Architecture** backed by PostgreSQL (`AiProvider` and `AiModel` Prisma tables):

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      DYNAMIC AI MODEL MANAGEMENT LIFECYCLE                  │
│                                                                             │
│  1. PROVIDER REGISTRATION (Admin enters API Key for Provider)               │
│        │                                                                    │
│        ▼                                                                    │
│  2. LIVE CATALOG DISCOVERY (System calls provider's model list endpoint)    │
│        │                                                                    │
│        ▼                                                                    │
│  3. CAPABILITY & COST CLASSIFICATION                                        │
│     (Extract context window, pricing per 1M tokens, free-tier flag, vision) │
│        │                                                                    │
│        ▼                                                                    │
│  4. ADMIN SELECTION / AUTO-DEFAULT ASSIGNMENT                               │
│     (Select default model from live list; auto-pick cheapest working model) │
│        │                                                                    │
│        ▼                                                                    │
│  5. RUNTIME PRIORITY & RESILIENT FALLBACK ROUTING                           │
│     (Try Provider 1 (OpenRouter) -> Failover -> Provider 2 (NVIDIA) -> ...) │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Provider Discovery Endpoints & Capabilities

SellerSalt integrates with 4 leading AI providers, fetching live model catalogs directly from their official endpoints:

| Provider | Model Discovery Endpoint | Auth Required for Discovery? | Supported Features |
| :--- | :--- | :--- | :--- |
| **OpenRouter** | `GET https://openrouter.ai/api/v1/models` | Optional (Public endpoint reports 400+ models + pricing + free tier) | Live pricing per 1M tokens, context length, free tier flags (`isFree: true`). |
| **NVIDIA NIM** | `GET https://integrate.api.nvidia.com/v1/models` | No (Public catalog endpoint) | Fast open-source models (Llama 3.3 70B, Mistral, Qwen). |
| **Google Gemini** | `GET https://generativelanguage.googleapis.com/v1beta/models?key={apiKey}` | Yes (Requires Gemini API Key) | Gemini 2.0 Flash, Gemini 1.5 Pro, vision support. |
| **OpenAI** | `GET https://api.openai.com/v1/models` | Yes (Bearer token required) | GPT-4o, GPT-4o-mini, structured JSON output. |

---

## 3. Dynamic Catalog Refresh & Fallback Logic

### 3.1 Model Catalog Storage (`AiModel`)
When an admin clicks **"Refresh Models"** or an automated cron runs:
1. The system calls the provider's model endpoint via `src/lib/ai-model-discovery.ts`.
2. Existing `AiModel` records for that `providerId` are updated/upserted.
3. If the currently selected `defaultModelId` was deprecated or removed by the provider, the system auto-selects the highest-rated available model (preferring free or low-cost models).

### 3.2 Runtime Fallback Execution Chain
When SaltBot or the Content Generator needs an LLM completion:
```typescript
// 1. Fetch active providers ordered by priority (lower number = tried first)
const activeProviders = await prisma.aiProvider.findMany({
  where: { isActive: true, encryptedApiKey: { not: null }, defaultModelId: { not: null } },
  orderBy: { priority: "asc" },
});

// 2. Iterate through providers sequentially
for (const provider of activeProviders) {
  try {
    const response = await callProvider(
      provider.provider,
      decrypt(provider.encryptedApiKey),
      provider.defaultModelId,
      messages
    );
    if (response) return response; // Success!
  } catch (err) {
    console.warn(`Provider ${provider.provider} failed with model ${provider.defaultModelId}. Falling back to next provider...`);
    // Fallback to next provider in priority chain
  }
}
```

---

## 4. Cost Control & Capability Classification

Models in the `AiModel` registry are classified into 4 operational tiers:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          MODEL CLASSIFICATION TIERS                         │
├──────────────────────────────────────┬──────────────────────────────────────┤
│ 1. FREE TIER (Zero Cost)             │ 2. ULTRA-LOW COST (High Speed)       │
│    • E.g., OpenRouter Free models    │    • E.g., GPT-4o-mini, Gemini Flash │
│    • Use case: Basic chat & queries  │    • Use case: Keyword tag clustering│
├──────────────────────────────────────┼──────────────────────────────────────┤
│ 3. HIGH REASONING (Quality Copy)     │ 4. MULTIMODAL (Vision)               │
│    • E.g., Claude 3.5 Sonnet, GPT-4o │    • E.g., GPT-4o, Gemini 2.0 Flash  │
│    • Use case: Listing descriptions  │    • Use case: Product photo audits  │
└──────────────────────────────────────┴──────────────────────────────────────┘
```
