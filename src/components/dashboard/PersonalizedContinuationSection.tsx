"use client";

import React from "react";
import Link from "next/link";
import {
  Clock,
  ArrowRight,
  Sparkles,
  Layers,
  Compass,
  CheckCircle2,
  Bookmark,
  ShieldCheck,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { FirstTimeMerchantGuide } from "./FirstTimeMerchantGuide";

export interface ActivityItem {
  id: string;
  type: "WORKSPACE" | "VALIDATION" | "RESEARCH_RUN" | "SAVED_OPPORTUNITY";
  title: string;
  subtitle?: string;
  marketplace?: string;
  verdict?: string;
  score?: number;
  timestamp: string | Date;
  href: string;
}

interface PersonalizedContinuationProps {
  recentActivities: ActivityItem[];
  userName: string;
}

export function PersonalizedContinuationSection({
  recentActivities,
  userName,
}: PersonalizedContinuationProps) {
  if (!recentActivities || recentActivities.length === 0) {
    return <FirstTimeMerchantGuide />;
  }

  const getVerdictBadge = (verdict?: string) => {
    if (!verdict) return null;
    switch (verdict.toUpperCase()) {
      case "PURSUE":
      case "STRONG_CANDIDATE":
        return <Badge variant="success" className="text-[9px] font-bold">PURSUE</Badge>;
      case "INVESTIGATE":
      case "WORTH_INVESTIGATING":
        return <Badge variant="info" className="text-[9px] font-bold">INVESTIGATE</Badge>;
      case "TEST":
      case "MIXED_SIGNALS":
        return <Badge variant="warning" className="text-[9px] font-bold">TEST</Badge>;
      case "WAIT":
      case "REJECT":
      case "HIGH_COMPETITION":
        return <Badge variant="danger" className="text-[9px] font-bold">{verdict}</Badge>;
      default:
        return <Badge variant="neutral" className="text-[9px] font-bold">{verdict}</Badge>;
    }
  };

  const getTypeIcon = (type: ActivityItem["type"]) => {
    switch (type) {
      case "WORKSPACE":
        return <Layers className="w-4 h-4 text-purple-600" />;
      case "VALIDATION":
        return <Sparkles className="w-4 h-4 text-emerald-600" />;
      case "SAVED_OPPORTUNITY":
        return <Bookmark className="w-4 h-4 text-amber-600" />;
      case "RESEARCH_RUN":
      default:
        return <Compass className="w-4 h-4 text-sky-600" />;
    }
  };

  return (
    <Card className="p-6 md:p-8 border rounded-2xl bg-card space-y-5 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Clock className="h-3.5 w-3.5" />
            </span>
            <span className="text-[11px] font-bold uppercase tracking-wider text-primary">
              Recent Decisions & Workspaces
            </span>
          </div>
          <h2 className="text-xl font-black text-foreground">Continue Where You Left Off</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Pick up active product evaluations, validated ideas, and workspace planning.
          </p>
        </div>

        <Link href="/research-center">
          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline">
            View All Research History <ArrowRight className="w-3.5 h-3.5" />
          </span>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {recentActivities.slice(0, 6).map((item) => (
          <div
            key={item.id}
            className="p-4 rounded-xl border bg-muted/15 hover:border-primary/40 transition-all flex flex-col justify-between space-y-3 shadow-2xs"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <div className="p-1.5 rounded-lg bg-background border">
                    {getTypeIcon(item.type)}
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    {item.type.replace(/_/g, " ")}
                  </span>
                </div>
                {getVerdictBadge(item.verdict)}
              </div>

              <div>
                <h3 className="text-sm font-bold text-foreground line-clamp-1">{item.title}</h3>
                {item.subtitle && (
                  <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{item.subtitle}</p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t text-[11px]">
              <span className="text-muted-foreground">
                {typeof item.timestamp === "string" ? item.timestamp : new Date(item.timestamp).toLocaleDateString()}
              </span>

              <Button
                href={item.href}
                size="compact"
                variant="secondary"
                className="text-xs font-semibold px-2.5 h-7"
              >
                <span>Resume</span>
                <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
