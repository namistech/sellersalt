"use client";

import React from "react";
import Link from "next/link";
import { Sparkles, ArrowRight, ShieldCheck, Zap } from "lucide-react";
import { Card, Badge, Button, Heading, Text } from "@/components/ui";

export interface PlanUsageCardProps {
  planName?: string;
  keywordUsage?: { current: number; limit: number };
  productUsage?: { current: number; limit: number };
  seoUsage?: { current: number; limit: number };
  competitorUsage?: { current: number; limit: number };
  className?: string;
}

export function PlanUsageCard({
  planName = "Starter Plan",
  keywordUsage = { current: 42, limit: 250 },
  productUsage = { current: 18, limit: 150 },
  seoUsage = { current: 6, limit: 25 },
  competitorUsage = { current: 3, limit: 10 },
  className = "",
}: PlanUsageCardProps) {
  return (
    <Card padding="md" className={`border-line bg-white shadow-xs space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-[#0E8F5D]" />
          <Heading as="h3" size="h4">Subscription Plan &amp; Quota</Heading>
          <Badge variant="success" className="text-xs font-mono">
            {planName}
          </Badge>
        </div>

        <Link
          href="/pricing"
          className="text-xs font-bold text-[#0E8F5D] hover:underline inline-flex items-center gap-1"
        >
          <span>Upgrade Tier</span>
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
        {/* Keywords */}
        <div className="p-2.5 rounded-xl border border-line bg-[#FAFAF8] space-y-1.5">
          <div className="flex justify-between text-[10px] text-ink-tertiary uppercase font-bold">
            <span>Keywords</span>
            <span className="font-mono text-ink font-extrabold">{keywordUsage.current}/{keywordUsage.limit}</span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-line-subtle overflow-hidden">
            <div
              className="h-full bg-[#0E8F5D]"
              style={{ width: `${Math.min(100, (keywordUsage.current / keywordUsage.limit) * 100)}%` }}
            />
          </div>
        </div>

        {/* Product Research */}
        <div className="p-2.5 rounded-xl border border-line bg-[#FAFAF8] space-y-1.5">
          <div className="flex justify-between text-[10px] text-ink-tertiary uppercase font-bold">
            <span>Products</span>
            <span className="font-mono text-ink font-extrabold">{productUsage.current}/{productUsage.limit}</span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-line-subtle overflow-hidden">
            <div
              className="h-full bg-[#3B82F6]"
              style={{ width: `${Math.min(100, (productUsage.current / productUsage.limit) * 100)}%` }}
            />
          </div>
        </div>

        {/* SEO Audits */}
        <div className="p-2.5 rounded-xl border border-line bg-[#FAFAF8] space-y-1.5">
          <div className="flex justify-between text-[10px] text-ink-tertiary uppercase font-bold">
            <span>SEO Audits</span>
            <span className="font-mono text-ink font-extrabold">{seoUsage.current}/{seoUsage.limit}</span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-line-subtle overflow-hidden">
            <div
              className="h-full bg-[#FFB020]"
              style={{ width: `${Math.min(100, (seoUsage.current / seoUsage.limit) * 100)}%` }}
            />
          </div>
        </div>

        {/* Tracked Shops */}
        <div className="p-2.5 rounded-xl border border-line bg-[#FAFAF8] space-y-1.5">
          <div className="flex justify-between text-[10px] text-ink-tertiary uppercase font-bold">
            <span>Tracked Shops</span>
            <span className="font-mono text-ink font-extrabold">{competitorUsage.current}/{competitorUsage.limit}</span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-line-subtle overflow-hidden">
            <div
              className="h-full bg-[#8B5CF6]"
              style={{ width: `${Math.min(100, (competitorUsage.current / competitorUsage.limit) * 100)}%` }}
            />
          </div>
        </div>
      </div>
    </Card>
  );
}
