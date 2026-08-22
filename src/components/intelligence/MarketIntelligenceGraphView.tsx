"use client";

import React, { useState, useEffect } from "react";
import {
  Layers,
  ShoppingBag,
  Users,
  Compass,
  Tag,
  FolderTree,
  Sparkles,
  RefreshCw,
  ExternalLink,
  ChevronRight,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import type { SubgraphExtract } from "@/marketplaces/core/graph/relationships";

interface MarketGraphViewProps {
  rootEntityId?: string;
}

export function MarketIntelligenceGraphView({
  rootEntityId,
}: MarketGraphViewProps) {
  const [subgraph, setSubgraph] = useState<SubgraphExtract | null>(null);
  const [stats, setStats] = useState<{ nodeCount: number; edgeCount: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedNode, setSelectedNode] = useState<any | null>(null);

  const fetchGraph = async () => {
    setLoading(true);
    try {
      if (rootEntityId) {
        const res = await fetch(`/api/intelligence/graph?rootId=${encodeURIComponent(rootEntityId)}&depth=2`);
        if (res.ok) {
          const data = await res.json();
          setSubgraph(data);
        }
      } else {
        const res = await fetch("/api/intelligence/graph");
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
      }
    } catch {
      // Degrade cleanly
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGraph();
  }, [rootEntityId]);

  return (
    <div className="space-y-6">
      <Card className="p-6 border rounded-2xl bg-card shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Layers className="w-5 h-5 text-primary" />
              Proprietary Market Intelligence Graph
            </h2>
            <p className="text-xs text-muted-foreground">
              Connected network linking Products, Dominant Sellers, Category Taxonomies, and Keywords.
            </p>
          </div>

          {stats && (
            <div className="flex items-center gap-2 text-sm">
              <Badge variant="neutral" className="text-label-sm">
                {stats.nodeCount} Total Entities
              </Badge>
              <Badge variant="neutral" className="text-label-sm">
                {stats.edgeCount} Verified Relationships
              </Badge>
            </div>
          )}
        </div>

        {subgraph && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-4 border-t">
            {/* Graph Nodes List */}
            <div className="lg:col-span-2 space-y-3">
              <h3 className="text-sm font-bold text-foreground">
                Connected Nodes ({subgraph.nodes.length}) & Edges ({subgraph.edges.length})
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-96 overflow-y-auto pr-1">
                {subgraph.nodes.map((node) => (
                  <div
                    key={node.id}
                    onClick={() => setSelectedNode(node)}
                    className={`p-3 rounded-xl border text-sm cursor-pointer transition-colors space-y-1 ${
                      selectedNode?.id === node.id
                        ? "bg-primary/10 border-primary"
                        : "bg-muted/30 border-border hover:bg-muted/50"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <Badge variant="neutral" className="text-label-sm">
                        {node.entityType}
                      </Badge>
                      {node.marketplace && (
                        <span className="text-label-sm text-muted-foreground capitalize">{node.marketplace}</span>
                      )}
                    </div>
                    <p className="font-bold text-foreground truncate">{node.label}</p>
                    {node.metrics?.price !== undefined && (
                      <span className="text-sm text-primary font-semibold">
                        ${node.metrics.price.toFixed(2)}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Selected Node Details */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-foreground">Entity Details</h3>
              {selectedNode ? (
                <div className="p-4 rounded-xl bg-card border space-y-3 text-sm">
                  <Badge variant="neutral" className="text-label-sm">
                    {selectedNode.entityType}
                  </Badge>
                  <h4 className="font-bold text-foreground">{selectedNode.label}</h4>
                  <div className="space-y-1.5 text-muted-foreground text-meta">
                    <div>Canonical ID: <code className="text-label-sm block truncate">{selectedNode.id}</code></div>
                    {selectedNode.marketplace && <div>Marketplace: <span className="capitalize text-foreground font-medium">{selectedNode.marketplace}</span></div>}
                    {selectedNode.metrics?.price !== undefined && <div>Price: <span className="text-foreground font-semibold">${selectedNode.metrics.price.toFixed(2)}</span></div>}
                  </div>
                </div>
              ) : (
                <div className="p-8 rounded-xl bg-muted/20 border text-center text-sm text-muted-foreground">
                  Select a node to inspect entity metrics and relationships.
                </div>
              )}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
