"use client";

import React, { useState, useEffect } from "react";
import {
  Bookmark,
  Bell,
  Trash2,
  ExternalLink,
  Sparkles,
  TrendingUp,
  AlertTriangle,
  Compass,
  Search,
  Check,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import type {
  OpportunityWatchItem,
  OpportunityAlertRecord,
} from "@/marketplaces/core/autonomous-discovery-types";
import { useRouter } from "next/navigation";

export function WatchlistAlertsView() {
  const router = useRouter();
  const [watchlist, setWatchlist] = useState<OpportunityWatchItem[]>([]);
  const [alerts, setAlerts] = useState<OpportunityAlertRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchWatchlistData = async () => {
    setLoading(true);
    try {
      const [wRes, aRes] = await Promise.all([
        fetch("/api/watchlist"),
        fetch("/api/watchlist/alerts"),
      ]);

      if (wRes.ok) {
        const wData = await wRes.json();
        setWatchlist(wData.watchlist || []);
      }
      if (aRes.ok) {
        const aData = await aRes.json();
        setAlerts(aData.alerts || []);
      }
    } catch {
      // Degrade cleanly
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWatchlistData();
  }, []);

  const handleRemove = async (id: string) => {
    try {
      await fetch(`/api/watchlist/${encodeURIComponent(id)}`, { method: "DELETE" });
      setWatchlist((prev) => prev.filter((item) => item.id !== id));
    } catch {
      // Degrade cleanly
    }
  };

  const handleValidate = (title: string, marketplace: string) => {
    router.push(`/validate?query=${encodeURIComponent(title)}&marketplace=${marketplace}`);
  };

  return (
    <div className="space-y-8">
      {/* Alerts Feed */}
      {alerts.length > 0 && (
        <Card className="p-6 border rounded-2xl bg-card space-y-4 shadow-sm">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-primary" />
            <h2 className="text-base font-bold text-foreground">Opportunity Alerts</h2>
            <Badge variant="neutral" className="text-label-sm">
              {alerts.length} New
            </Badge>
          </div>

          <div className="space-y-2">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className="p-3 rounded-xl border bg-muted/20 text-sm flex items-center justify-between gap-3"
              >
                <div className="space-y-0.5">
                  <span className="font-bold text-foreground block">{alert.title}</span>
                  <p className="text-muted-foreground">{alert.description}</p>
                </div>
                <Badge
                  variant={
                    alert.severity === "OPPORTUNITY"
                      ? "success"
                      : alert.severity === "WARNING"
                      ? "warning"
                      : "neutral"
                  }
                  className="text-label-sm shrink-0"
                >
                  {alert.severity}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Watchlist Table */}
      <Card className="p-6 border rounded-2xl bg-card space-y-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Bookmark className="w-5 h-5 text-primary" />
              Watched Opportunities ({watchlist.length})
            </h2>
            <p className="text-sm text-muted-foreground">
              Continuously monitored products, keywords, and niches tracking score and momentum shifts.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Loading watchlist...</div>
        ) : watchlist.length === 0 ? (
          <div className="p-12 text-center text-sm text-muted-foreground border border-dashed rounded-xl space-y-2">
            <Bookmark className="w-6 h-6 text-muted-foreground mx-auto" />
            <p>Your opportunity watchlist is currently empty.</p>
            <p className="text-meta">Save opportunities from the Autonomous Discovery Center or Opportunity Radar.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b text-muted-foreground font-semibold">
                  <th className="pb-2">Target Title</th>
                  <th className="pb-2">Type</th>
                  <th className="pb-2">Marketplace</th>
                  <th className="pb-2">Current Score</th>
                  <th className="pb-2">Momentum</th>
                  <th className="pb-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {watchlist.map((item) => (
                  <tr key={item.id} className="hover:bg-muted/30">
                    <td className="py-3 font-bold text-foreground max-w-xs truncate">{item.title}</td>
                    <td className="py-3">
                      <Badge variant="neutral" className="text-label-sm">
                        {item.type}
                      </Badge>
                    </td>
                    <td className="py-3 capitalize">{item.marketplace}</td>
                    <td className="py-3 font-bold text-primary">
                      {item.currentScore !== null ? `${item.currentScore}/100` : "—"}
                    </td>
                    <td className="py-3 font-medium">{item.momentum}</td>
                    <td className="py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          onClick={() => handleValidate(item.title, item.marketplace)}
                          size="compact"
                          variant="secondary"
                          className="text-sm font-semibold"
                        >
                          <Compass className="w-3 h-3 mr-1" />
                          Validate
                        </Button>
                        <button
                          onClick={() => handleRemove(item.id)}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
