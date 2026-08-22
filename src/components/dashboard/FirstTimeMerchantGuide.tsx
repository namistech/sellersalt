"use client";

import React from "react";
import Link from "next/link";
import {
  Compass,
  Search,
  CheckCircle2,
  Layers,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  Flame,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

export function FirstTimeMerchantGuide() {
  const STEPS = [
    {
      step: 1,
      name: "Discover",
      title: "1. Discover Opportunities",
      description: "Explore empirical radar signals, emerging niches, and product gaps across public commerce catalogs.",
      href: "/discovery",
      cta: "Discover Ideas",
      icon: Flame,
      color: "text-amber-600 bg-amber-500/10",
    },
    {
      step: 2,
      name: "Research",
      title: "2. Research Live Signals",
      description: "Observe real listing prices, review barriers, seller saturation, and empirical keyword tokens without guessing.",
      href: "/research-center",
      cta: "Start Research",
      icon: Search,
      color: "text-sky-600 bg-sky-500/10",
    },
    {
      step: 3,
      name: "Validate",
      title: "3. Validate Feasibility",
      description: "Run deterministic commercial decision models (PURSUE, TEST, WAIT, REJECT) based on observable evidence.",
      href: "/validate",
      cta: "Validate Product",
      icon: Sparkles,
      color: "text-emerald-600 bg-emerald-500/10",
    },
    {
      step: 4,
      name: "Plan & Launch",
      title: "4. Plan Sourcing & Launch",
      description: "Configure product features, model unit economics (Base, Conservative, Optimistic), and generate action plans.",
      href: "/product-workspaces",
      cta: "Open Workspace",
      icon: Layers,
      color: "text-purple-600 bg-purple-500/10",
    },
  ];

  return (
    <Card className="p-6 md:p-8 border rounded-2xl bg-card space-y-6 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
              <ShieldCheck className="h-3.5 w-3.5" />
            </span>
            <span className="text-label-sm font-bold uppercase tracking-wider text-emerald-600">
              Merchant Launchpad
            </span>
          </div>
          <h2 className="text-xl font-black text-foreground">
            How SellerSalt Powers Your Ecommerce Decisions
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Turn observable marketplace signals into profitable product launches before committing capital.
          </p>
        </div>

        <Badge variant="success" className="text-label-sm font-bold uppercase shrink-0">
          Zero-Fabrication Intelligence
        </Badge>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {STEPS.map((s) => {
          const Icon = s.icon;
          return (
            <div
              key={s.step}
              className="p-4 rounded-xl border bg-muted/15 flex flex-col justify-between space-y-4 hover:border-primary/40 transition-all shadow-2xs"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className={`p-2 rounded-xl ${s.color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <Badge variant="neutral" className="text-label-sm font-bold">
                    Step {s.step}
                  </Badge>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-foreground">{s.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                    {s.description}
                  </p>
                </div>
              </div>

              <Button
                href={s.href}
                size="compact"
                variant="secondary"
                className="w-full text-sm font-semibold"
              >
                <span>{s.cta}</span>
                <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
              </Button>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
