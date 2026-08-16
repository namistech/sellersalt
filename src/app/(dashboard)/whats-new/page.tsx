"use client";

import React from "react";
import Link from "next/link";
import {
  Sparkles,
  Zap,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  Tag,
  ArrowRight,
  TrendingUp,
  Award,
} from "lucide-react";
import { Card, Badge, Button, Heading, Text, HowItWorksGuide } from "@/components/ui";
import { PageHeader } from "@/components/shell";
import { RELEASES, type ChangeType } from "@/services/changelog";

function getChangeBadge(type: ChangeType) {
  switch (type) {
    case "NEW":
      return <Badge variant="success" className="font-bold text-[10px]">NEW</Badge>;
    case "IMPROVED":
      return <Badge variant="info" className="font-bold text-[10px]">IMPROVED</Badge>;
    case "FIXED":
      return <Badge variant="warning" className="font-bold text-[10px]">FIXED</Badge>;
    case "PERFORMANCE":
      return <Badge variant="neutral" className="font-bold text-[10px]">SPEED</Badge>;
    case "SECURITY":
      return <Badge variant="neutral" className="font-bold text-[10px]">SECURITY</Badge>;
  }
}

export default function WhatsNewPage() {
  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-16">
      {/* Contextual Guide */}
      <HowItWorksGuide
        title="What's New in SellerSalt"
        description="We ship continuous improvements and new intelligence tools weekly to help you build a profitable Etsy business."
        steps={[
          {
            title: "1. Verified Capabilities",
            description: "All features adhere strictly to official Etsy API v3 terms with zero unauthorized scraping.",
            badge: "Compliant",
          },
          {
            title: "2. Transparent Changelog",
            description: "Every release notes specific functional updates, performance boosts, and bug fixes.",
            badge: "Weekly Releases",
          },
          {
            title: "3. Community Driven",
            description: "Check the public Roadmap to request new features or vote on upcoming tools.",
            badge: "Roadmap",
          },
        ]}
      />

      <PageHeader
        title="What's New in SellerSalt"
        description="Latest product updates, performance enhancements, and new market intelligence tools."
        primaryAction={
          <Link href="/roadmap">
            <Button variant="secondary" size="compact" className="text-xs font-bold">
              <Sparkles className="h-3.5 w-3.5 mr-1.5 text-[#0E8F5D] inline" />
              Community Roadmap
            </Button>
          </Link>
        }
      />

      {/* Release Timeline */}
      <div className="space-y-8">
        {RELEASES.map((release, idx) => (
          <Card
            key={release.version}
            padding="lg"
            className="border-line bg-white shadow-xs space-y-5"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-line-subtle">
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 rounded-xl bg-[#E7FAF1] text-[#0E8F5D] font-bold text-sm border border-[#16C784]/30 tabular-nums">
                  {release.version}
                </span>
                <h2 className="text-lg font-bold text-ink">{release.headline}</h2>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-ink-tertiary">
                <Calendar className="h-3.5 w-3.5" />
                <span>{release.date}</span>
                {idx === 0 && (
                  <Badge variant="success" className="ml-2 text-[10px] font-bold">
                    Latest Release
                  </Badge>
                )}
              </div>
            </div>

            <p className="text-sm text-ink-secondary leading-relaxed">
              {release.summary}
            </p>

            <div className="space-y-2.5 pt-2">
              <div className="text-[11px] font-bold text-ink-tertiary uppercase tracking-wider">
                Release Highlights
              </div>
              <div className="grid grid-cols-1 gap-2.5">
                {release.changes.map((change, cIdx) => (
                  <div
                    key={cIdx}
                    className="p-3 rounded-xl border border-line-subtle bg-[#FAFAF8] flex items-start gap-3 text-xs"
                  >
                    <div className="shrink-0 mt-0.5">{getChangeBadge(change.type)}</div>
                    <span className="text-ink font-medium leading-relaxed">{change.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
