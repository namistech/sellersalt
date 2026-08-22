"use client";

import { useState } from "react";
import { ChevronRight, ChevronDown, FolderTree, Search, Sparkles, Folder } from "lucide-react";
import { Input, Badge, Text } from "@/components/ui";
import type { EtsyRawTaxonomyNode, FlattenedTaxonomyNode } from "@/connectors/etsy/taxonomy";

interface TaxonomyTreeBrowserProps {
  roots: EtsyRawTaxonomyNode[];
  selectedTaxonomyId: number | null;
  onSelectCategory: (taxonomyId: number) => void;
  searchResults?: FlattenedTaxonomyNode[];
  searchQuery: string;
  onSearchChange: (query: string) => void;
  isLoading?: boolean;
}

export function TaxonomyTreeBrowser({
  roots,
  selectedTaxonomyId,
  onSelectCategory,
  searchResults,
  searchQuery,
  onSearchChange,
  isLoading,
}: TaxonomyTreeBrowserProps) {
  const [expandedMap, setExpandedMap] = useState<Record<number, boolean>>({});

  function toggleExpand(id: number, e: React.MouseEvent) {
    e.stopPropagation();
    setExpandedMap((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function renderNode(node: EtsyRawTaxonomyNode, depth = 0) {
    const isExpanded = Boolean(expandedMap[node.id]);
    const isSelected = selectedTaxonomyId === node.id;
    const hasChildren = Boolean(node.children && node.children.length > 0);

    return (
      <div key={node.id} className="select-none">
        <div
          onClick={() => onSelectCategory(node.id)}
          className={`flex items-center justify-between gap-1.5 px-2.5 py-1.5 rounded-lg text-xs cursor-pointer transition-colors ${
            isSelected
              ? "bg-[#0E8F5D] text-white font-bold"
              : "text-ink-secondary hover:bg-surface-muted hover:text-ink font-medium"
          }`}
          style={{ paddingLeft: `${Math.max(10, depth * 16 + 10)}px` }}
        >
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            {hasChildren ? (
              <button
                type="button"
                onClick={(e) => toggleExpand(node.id, e)}
                className={`p-0.5 rounded hover:bg-black/10 transition-colors ${
                  isSelected ? "text-white" : "text-ink-tertiary"
                }`}
              >
                {isExpanded ? (
                  <ChevronDown className="h-3.5 w-3.5" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5" />
                )}
              </button>
            ) : (
              <span className="w-4" />
            )}

            <Folder className={`h-3.5 w-3.5 shrink-0 ${isSelected ? "text-white" : "text-ink-tertiary"}`} />
            <span className="truncate">{node.name}</span>
          </div>

          {hasChildren && (
            <span
              className={`text-label-sm px-1.5 py-0.2 rounded font-mono shrink-0 ${
                isSelected ? "bg-white/20 text-white" : "bg-surface-muted text-ink-tertiary"
              }`}
            >
              {node.children!.length}
            </span>
          )}
        </div>

        {hasChildren && isExpanded && (
          <div className="space-y-0.5 mt-0.5">
            {node.children!.map((child) => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Search Input */}
      <div className="relative">
        <Input
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Filter taxonomy nodes..."
          className="text-sm pl-8 h-8"
        />
        <Search className="h-3.5 w-3.5 text-ink-tertiary absolute left-2.5 top-2.5 pointer-events-none" />
      </div>

      {/* Tree Content / Search Results */}
      <div className="max-h-[600px] overflow-y-auto pr-1 space-y-1">
        {searchQuery.trim() ? (
          searchResults && searchResults.length > 0 ? (
            <div className="space-y-1">
              <div className="text-label-sm uppercase font-bold text-ink-tertiary px-2">
                Matching Categories ({searchResults.length})
              </div>
              {searchResults.map((result) => {
                const isSelected = selectedTaxonomyId === result.id;
                return (
                  <div
                    key={result.id}
                    onClick={() => onSelectCategory(result.id)}
                    className={`p-2 rounded-lg text-sm cursor-pointer transition-colors ${
                      isSelected
                        ? "bg-[#0E8F5D] text-white font-bold"
                        : "text-ink-secondary hover:bg-surface-muted hover:text-ink font-medium"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="truncate font-semibold">{result.name}</span>
                      <span className={`text-label-sm font-mono ${isSelected ? "text-white/80" : "text-ink-tertiary"}`}>
                        L{result.level}
                      </span>
                    </div>
                    <div className={`text-meta truncate mt-0.5 ${isSelected ? "text-white/80" : "text-ink-tertiary"}`}>
                      {result.fullPath}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-4 text-center text-xs text-ink-tertiary">
              No categories found matching &quot;{searchQuery}&quot;
            </div>
          )
        ) : isLoading ? (
          <div className="p-4 text-center text-xs text-ink-tertiary">
            Loading taxonomy tree...
          </div>
        ) : (
          <div className="space-y-0.5">
            {roots.map((root) => renderNode(root, 0))}
          </div>
        )}
      </div>
    </div>
  );
}
