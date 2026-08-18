"use client";

import React, { useState } from "react";
import {
  Sparkles,
  Bot,
  Zap,
  Shield,
  Server,
  Database,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  Search,
  Code2,
  Cpu,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

interface ApiProvider {
  id: string;
  name: string;
  category: "Free Tier" | "Production AI" | "Infrastructure" | "Data Provider";
  pricingModel: "100% Free" | "Pay-as-you-go" | "Free Tier + Paid" | "Enterprise";
  description: string;
  configured: boolean;
  docUrl: string;
  models?: string[];
  latencyMs?: number;
}

export function ApiProvidersView() {
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");

  const providers: ApiProvider[] = [
    // Free / Generous Tier
    {
      id: "gemini-dev",
      name: "Google Gemini (Developer Tier)",
      category: "Free Tier",
      pricingModel: "Free Tier + Paid",
      description: "Generous 15 RPM free tier for multimodal vision, OCR listing extraction, and title analysis.",
      configured: true,
      docUrl: "https://ai.google.dev/pricing",
      models: ["gemini-1.5-flash", "gemini-1.5-pro"],
      latencyMs: 310,
    },
    {
      id: "openrouter-free",
      name: "OpenRouter Community Models",
      category: "Free Tier",
      pricingModel: "100% Free",
      description: "Free inference endpoint for open-weights models (Meta Llama 3.1, Mistral, DeepSeek).",
      configured: false,
      docUrl: "https://openrouter.ai/models?max_price=0",
      models: ["meta-llama/llama-3.1-8b-instruct:free", "mistralai/mistral-7b-instruct:free"],
    },
    {
      id: "huggingface",
      name: "Hugging Face Inference API",
      category: "Free Tier",
      pricingModel: "Free Tier + Paid",
      description: "Serverless embedding models and semantic similarity scoring for title deduplication.",
      configured: false,
      docUrl: "https://huggingface.co/docs/api-inference",
      models: ["all-MiniLM-L6-v2", "bge-small-en-v1.5"],
    },

    // Production AI
    {
      id: "openai-gpt4o",
      name: "OpenAI GPT-4o",
      category: "Production AI",
      pricingModel: "Pay-as-you-go",
      description: "Industry-standard model for high-converting Etsy listing copy, tag optimization, and shop audits.",
      configured: true,
      docUrl: "https://platform.openai.com/docs",
      models: ["gpt-4o", "gpt-4o-mini", "o1-preview"],
      latencyMs: 450,
    },
    {
      id: "anthropic-claude",
      name: "Anthropic Claude 3.5 Sonnet",
      category: "Production AI",
      pricingModel: "Pay-as-you-go",
      description: "State-of-the-art reasoning engine for complex shop dossiers and competitive gap analysis.",
      configured: true,
      docUrl: "https://docs.anthropic.com",
      models: ["claude-3-5-sonnet-20241022", "claude-3-haiku-20240307"],
      latencyMs: 420,
    },
    {
      id: "nvidia-nim",
      name: "NVIDIA NIM Microservices",
      category: "Production AI",
      pricingModel: "Enterprise",
      description: "Hardware-accelerated LLM microservices for sub-100ms real-time keyword clustering.",
      configured: false,
      docUrl: "https://build.nvidia.com",
      models: ["meta/llama-3.1-70b-instruct", "mistralai/mixtral-8x22b-instruct"],
    },

    // Infrastructure & Storage
    {
      id: "cloudflare-r2",
      name: "Cloudflare R2 Object Storage",
      category: "Infrastructure",
      pricingModel: "Free Tier + Paid",
      description: "High-performance S3-compatible asset store with 0 egress fees for all branding & media files.",
      configured: true,
      docUrl: "https://developers.cloudflare.com/r2/",
      latencyMs: 45,
    },
    {
      id: "bullmq-redis",
      name: "Redis & BullMQ Pipeline",
      category: "Infrastructure",
      pricingModel: "100% Free",
      description: "Self-hosted async task queue maintaining strict 8 req/sec Etsy API rate limits.",
      configured: true,
      docUrl: "https://docs.bullmq.io",
      latencyMs: 2,
    },
    {
      id: "resend-smtp",
      name: "Transactional SMTP & Resend",
      category: "Infrastructure",
      pricingModel: "Free Tier + Paid",
      description: "High-deliverability transactional email service for password resets and surveillance alerts.",
      configured: true,
      docUrl: "https://resend.com/docs",
      latencyMs: 120,
    },

    // Data Providers
    {
      id: "etsy-openapi",
      name: "Etsy Open API v3",
      category: "Data Provider",
      pricingModel: "100% Free",
      description: "Official REST v3 endpoint with OAuth PKCE for real-time shop listings, tags, and stats.",
      configured: true,
      docUrl: "https://developers.etsy.com",
      latencyMs: 180,
    },
  ];

  const categories = [
    { id: "ALL", label: "All Providers" },
    { id: "Free Tier", label: "Free & Generous Tiers" },
    { id: "Production AI", label: "Production AI" },
    { id: "Infrastructure", label: "Infrastructure & Storage" },
    { id: "Data Provider", label: "Data Providers" },
  ];

  const filtered = providers.filter(
    (p) => selectedCategory === "ALL" || p.category === selectedCategory
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap pb-4 border-b border-[var(--color-line)]">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-[var(--color-ink)]">API & Model Providers Directory</h2>
            <Badge variant="success">
              {providers.filter((p) => p.configured).length} / {providers.length} Connected
            </Badge>
          </div>
          <p className="text-sm text-[var(--color-ink-muted)] mt-1">
            Segmented view of intelligence LLMs, zero-cost developer tiers, object storage providers, and rate-limited connectors.
          </p>
        </div>
      </div>

      {/* Categories */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
              selectedCategory === cat.id
                ? "bg-[var(--color-brand-primary)] text-white shadow-xs font-semibold"
                : "bg-[var(--color-surface)] text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] border border-[var(--color-line)]"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Providers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map((provider) => (
          <div
            key={provider.id}
            className="p-5 rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] shadow-sm hover:shadow transition-shadow flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between gap-2 mb-3">
                <div>
                  <h3 className="font-bold text-base text-[var(--color-ink)]">{provider.name}</h3>
                  <span className="text-[11px] font-mono text-[var(--color-ink-muted)] uppercase tracking-wider">
                    {provider.category}
                  </span>
                </div>
                <Badge variant={provider.configured ? "success" : "neutral"}>
                  {provider.configured ? "Configured" : "Available"}
                </Badge>
              </div>

              <p className="text-xs text-[var(--color-ink-muted)] leading-relaxed mb-4">{provider.description}</p>

              <div className="space-y-2 mb-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[var(--color-ink-muted)]">Pricing Model:</span>
                  <span className="font-semibold text-[var(--color-ink)]">{provider.pricingModel}</span>
                </div>

                {provider.latencyMs && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[var(--color-ink-muted)]">Live Gateway Latency:</span>
                    <span className="font-mono text-emerald-700 font-medium">{provider.latencyMs}ms</span>
                  </div>
                )}

                {provider.models && (
                  <div className="space-y-1 pt-1">
                    <span className="text-[10px] uppercase font-bold text-[var(--color-ink-muted)]">Models:</span>
                    <div className="flex flex-wrap gap-1">
                      {provider.models.map((m) => (
                        <span
                          key={m}
                          className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-[var(--color-paper)] border border-[var(--color-line)] text-[var(--color-ink)]"
                        >
                          {m}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-[var(--color-line)] flex items-center justify-between">
              <a
                href={provider.docUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-[var(--color-brand-primary)] hover:underline inline-flex items-center gap-1 font-medium"
              >
                <span>Documentation</span>
                <ExternalLink className="w-3 h-3" />
              </a>

              <a
                href="#integration-hub"
                className="text-xs text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] font-medium"
              >
                Configure in Hub →
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
