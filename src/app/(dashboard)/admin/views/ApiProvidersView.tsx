"use client";

import React, { useState } from "react";
import {
  Sparkles,
  Bot,
  Zap,
  Layers,
  CheckCircle2,
  ExternalLink,
  Shield,
  Cpu,
  Key,
  Flame,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

interface ApiProviderInfo {
  id: string;
  name: string;
  category: "Free Tier" | "Production AI" | "Infrastructure" | "Data Provider";
  pricingModel: string;
  description: string;
  configured: boolean;
  docUrl: string;
  latencyMs?: number;
  models?: string[];
}

interface ApiProvidersViewProps {
  onNavigateToHub?: () => void;
  openAiConfigured?: boolean;
  anthropicConfigured?: boolean;
  geminiConfigured?: boolean;
  r2Configured?: boolean;
  resendConfigured?: boolean;
  etsyConfigured?: boolean;
}

export function ApiProvidersView({
  onNavigateToHub,
  openAiConfigured,
  anthropicConfigured,
  geminiConfigured,
  r2Configured,
  resendConfigured,
  etsyConfigured,
}: ApiProvidersViewProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");

  const providers: ApiProviderInfo[] = [
    {
      id: "google-gemini",
      name: "Google Gemini API",
      category: "Free Tier",
      pricingModel: "Free Tier (15 RPM) + Pay-as-you-go",
      description:
        "High-performance multimodal models with generous zero-cost development tier for listing audits and title analysis.",
      configured: Boolean(geminiConfigured),
      docUrl: "https://ai.google.dev",
      latencyMs: 380,
      models: ["gemini-1.5-flash", "gemini-1.5-pro"],
    },
    {
      id: "cloudflare-r2",
      name: "Cloudflare R2 Object Storage",
      category: "Free Tier",
      pricingModel: "Free 10GB/mo + Zero Egress Fees",
      description:
        "S3-compatible global asset storage for user avatars, custom shop logos, and listing media without bandwidth fees.",
      configured: Boolean(r2Configured),
      docUrl: "https://dash.cloudflare.com",
      latencyMs: 95,
    },
    {
      id: "resend-email",
      name: "Resend Transactional Email",
      category: "Free Tier",
      pricingModel: "Free 3,000 emails/month (100/day)",
      description:
        "Developer-friendly email delivery engine for account verification, password resets, and audit reports.",
      configured: Boolean(resendConfigured),
      docUrl: "https://resend.com/api-keys",
      latencyMs: 140,
    },
    {
      id: "openai",
      name: "OpenAI Platform",
      category: "Production AI",
      pricingModel: "Usage-based per 1M tokens",
      description:
        "State-of-the-art reasoning and listing copy generation for high-volume listing studio workflows.",
      configured: Boolean(openAiConfigured),
      docUrl: "https://platform.openai.com/api-keys",
      latencyMs: 520,
      models: ["gpt-4o", "gpt-4o-mini"],
    },
    {
      id: "anthropic",
      name: "Anthropic Claude",
      category: "Production AI",
      pricingModel: "Usage-based per 1M tokens",
      description:
        "Superior nuance and instruction following for complex multi-factor SEO scoring and listing rewrites.",
      configured: Boolean(anthropicConfigured),
      docUrl: "https://console.anthropic.com",
      latencyMs: 610,
      models: ["claude-3-5-sonnet-20241022", "claude-3-5-haiku-20241022"],
    },
    {
      id: "etsy-openapi",
      name: "Etsy Open API v3",
      category: "Data Provider",
      pricingModel: "Free with Developer App Registration",
      description:
        "Official Etsy v3 marketplace API for listing synchronization, shop details, and OAuth seller authorization.",
      configured: Boolean(etsyConfigured),
      docUrl: "https://developers.etsy.com",
      latencyMs: 290,
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
      <div className="flex items-start justify-between gap-4 flex-wrap pb-4 border-b border-line">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-ink">API & Model Providers Directory</h2>
            <Badge variant="success">
              {providers.filter((p) => p.configured).length} / {providers.length} Connected
            </Badge>
          </div>
          <p className="text-sm text-ink-secondary mt-1">
            Segmented view of intelligence LLMs, zero-cost developer tiers, object storage providers, and rate-limited connectors.
          </p>
        </div>
      </div>

      {/* Categories */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {categories.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 ${
              selectedCategory === cat.id
                ? "bg-[#141B16] text-white shadow-xs"
                : "bg-white text-ink-secondary hover:text-ink hover:bg-[#F4F3EF] border border-line"
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
            className="p-5 rounded-2xl border border-line bg-white shadow-xs hover:border-line-strong hover:shadow transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between gap-2 mb-3">
                <div>
                  <h3 className="font-bold text-base text-ink">{provider.name}</h3>
                  <span className="text-[11px] font-mono text-ink-tertiary uppercase tracking-wider">
                    {provider.category}
                  </span>
                </div>
                <Badge variant={provider.configured ? "success" : "neutral"}>
                  {provider.configured ? "Configured" : "Available"}
                </Badge>
              </div>

              <p className="text-xs text-ink-secondary leading-relaxed mb-4">{provider.description}</p>

              <div className="space-y-2 mb-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-ink-secondary">Pricing Model:</span>
                  <span className="font-semibold text-ink">{provider.pricingModel}</span>
                </div>

                {provider.latencyMs && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-ink-secondary">Live Gateway Latency:</span>
                    <span className="font-mono text-[#0E8F5D] font-semibold">{provider.latencyMs}ms</span>
                  </div>
                )}

                {provider.models && (
                  <div className="space-y-1 pt-1">
                    <span className="text-[10px] uppercase font-bold text-ink-tertiary">Models:</span>
                    <div className="flex flex-wrap gap-1">
                      {provider.models.map((m) => (
                        <span
                          key={m}
                          className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-[#FAFAF8] border border-line text-ink"
                        >
                          {m}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-line flex items-center justify-between">
              <a
                href={provider.docUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-[#0E8F5D] hover:underline inline-flex items-center gap-1 font-semibold"
              >
                <span>Documentation</span>
                <ExternalLink className="w-3 h-3" />
              </a>

              {onNavigateToHub && (
                <Button
                  size="compact"
                  variant="secondary"
                  onClick={onNavigateToHub}
                  className="text-xs h-7 px-2.5 font-semibold"
                >
                  Configure in Hub
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
