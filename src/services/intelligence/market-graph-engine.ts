/**
 * SellerSalt Market Intelligence Relationship Graph Engine
 * 
 * Ingests observations from research sessions and connects Products, Sellers,
 * Categories, Keywords, and Niches into a queryable Market Intelligence Graph.
 */

import type { NormalizedProduct, MarketplaceId } from "@/marketplaces/core/types";
import type {
  CanonicalMarketEntity,
  CanonicalProductEntity,
  CanonicalSellerEntity,
  CanonicalCategoryEntity,
  CanonicalKeywordEntity,
  MarketEntityType,
} from "@/marketplaces/core/graph/entities";
import type {
  MarketRelationshipEdge,
  MarketRelationshipType,
  SubgraphExtract,
} from "@/marketplaces/core/graph/relationships";
import { EntityResolutionEngine } from "./entity-resolution-engine";
import { evaluateFreshness } from "@/marketplaces/core/acquisition/freshness";

export class MarketGraphEngine {
  private static nodes = new Map<string, CanonicalMarketEntity>();
  private static edges = new Map<string, MarketRelationshipEdge>();
  private static nodeOutgoingEdges = new Map<string, Set<string>>();
  private static nodeIncomingEdges = new Map<string, Set<string>>();

  /**
   * Resets the in-memory graph (useful for tests).
   */
  public static clearGraph(): void {
    this.nodes.clear();
    this.edges.clear();
    this.nodeOutgoingEdges.clear();
    this.nodeIncomingEdges.clear();
  }

  /**
   * Adds or updates a canonical entity node.
   */
  public static upsertNode(entity: CanonicalMarketEntity): void {
    const existing = this.nodes.get(entity.id);
    if (existing) {
      existing.lastObservedAt = entity.lastObservedAt;
      existing.observationCount += 1;
      existing.freshness = entity.freshness;
      if (entity.entityType === "PRODUCT" && existing.entityType === "PRODUCT") {
        existing.price = entity.price ?? existing.price;
        existing.rating = entity.rating ?? existing.rating;
        existing.reviewCount = entity.reviewCount ?? existing.reviewCount;
        existing.latestOpportunityScore = entity.latestOpportunityScore ?? existing.latestOpportunityScore;
      }
    } else {
      this.nodes.set(entity.id, entity);
    }
  }

  /**
   * Adds or updates a relationship edge between two entities.
   */
  public static addEdge(edge: Omit<MarketRelationshipEdge, "id">): MarketRelationshipEdge {
    const id = `edge:${edge.relationshipType}:${edge.sourceEntityId}->${edge.targetEntityId}`;
    const fullEdge: MarketRelationshipEdge = {
      ...edge,
      id,
    };

    this.edges.set(id, fullEdge);

    if (!this.nodeOutgoingEdges.has(edge.sourceEntityId)) {
      this.nodeOutgoingEdges.set(edge.sourceEntityId, new Set());
    }
    this.nodeOutgoingEdges.get(edge.sourceEntityId)!.add(id);

    if (!this.nodeIncomingEdges.has(edge.targetEntityId)) {
      this.nodeIncomingEdges.set(edge.targetEntityId, new Set());
    }
    this.nodeIncomingEdges.get(edge.targetEntityId)!.add(id);

    return fullEdge;
  }

  /**
   * Ingests a collection of NormalizedProducts from a research run into the graph.
   */
  public static ingestProducts(
    products: NormalizedProduct[],
    options: {
      researchRunId?: string;
      organizationId?: string;
      source?: string;
    } = {}
  ): { nodesAdded: number; edgesAdded: number } {
    let nodesAdded = 0;
    let edgesAdded = 0;
    const now = new Date();

    const canonicalProducts: CanonicalProductEntity[] = [];

    // 1. Ingest Product and Seller Nodes
    for (const p of products) {
      const prodNode = EntityResolutionEngine.toCanonicalProduct(p, options.organizationId);
      const isNewProd = !this.nodes.has(prodNode.id);
      this.upsertNode(prodNode);
      if (isNewProd) nodesAdded++;
      canonicalProducts.push(prodNode);

      // Seller Node & Edge
      if (p.shop?.name) {
        const sellerId = EntityResolutionEngine.generateSellerId(p.marketplace, p.shop.name);
        const isNewSeller = !this.nodes.has(sellerId);
        const sellerNode: CanonicalSellerEntity = {
          id: sellerId,
          entityType: "SELLER",
          marketplace: p.marketplace,
          sellerName: p.shop.name,
          name: p.shop.name,
          normalizedName: p.shop.name.toLowerCase().trim(),
          observedActiveListings: p.shop.activeListings ?? null,
          observedTotalReviews: p.shop.reviewRatio ? Math.round(p.shop.reviewRatio * 100) : null,
          observedAverageRating: null,
          shopAgeMonths: p.shop.ageMonths ?? null,
          specializedCategories: p.categoryPath ?? [],
          establishedBarrier: (p.shop.ageMonths ?? 0) >= 24 ? "HIGH" : "MODERATE",
          firstObservedAt: now,
          lastObservedAt: now,
          observationCount: 1,
          freshness: evaluateFreshness(now, "general"),
          provenance: p.source || "ACTUAL_DATA",
          organizationId: options.organizationId,
        };
        this.upsertNode(sellerNode);
        if (isNewSeller) nodesAdded++;

        // Edge: PRODUCT_SOLD_BY_SELLER
        this.addEdge({
          sourceEntityId: prodNode.id,
          sourceEntityType: "PRODUCT",
          targetEntityId: sellerId,
          targetEntityType: "SELLER",
          relationshipType: "PRODUCT_SOLD_BY_SELLER",
          marketplace: p.marketplace,
          confidence: 100,
          matchConfidenceTier: "EXACT",
          evidence: {
            explanation: `Product listing specifies seller "${p.shop.name}" on ${p.marketplace}.`,
          },
          provenance: p.source || "ACTUAL_DATA",
          sourceResearchRunId: options.researchRunId,
          firstObservedAt: now,
          lastObservedAt: now,
          observationCount: 1,
        });
        edgesAdded++;
      }

      // Category Node & Edge
      if (p.categoryPath && p.categoryPath.length > 0) {
        const catId = EntityResolutionEngine.generateCategoryId(p.marketplace, p.categoryPath);
        const isNewCat = !this.nodes.has(catId);
        const catNode: CanonicalCategoryEntity = {
          id: catId,
          entityType: "CATEGORY",
          marketplace: p.marketplace,
          categoryPath: p.categoryPath,
          name: p.categoryPath.join(" > "),
          normalizedName: p.categoryPath.join(" > ").toLowerCase(),
          observedCatalogCount: 1,
          observedMinPrice: p.price ?? null,
          observedMedianPrice: p.price ?? null,
          observedMaxPrice: p.price ?? null,
          dominantKeywords: [],
          sellerConcentrationIndex: null,
          firstObservedAt: now,
          lastObservedAt: now,
          observationCount: 1,
          freshness: evaluateFreshness(now, "general"),
          provenance: p.source || "ACTUAL_DATA",
          organizationId: options.organizationId,
        };
        this.upsertNode(catNode);
        if (isNewCat) nodesAdded++;

        // Edge: PRODUCT_IN_CATEGORY
        this.addEdge({
          sourceEntityId: prodNode.id,
          sourceEntityType: "PRODUCT",
          targetEntityId: catId,
          targetEntityType: "CATEGORY",
          relationshipType: "PRODUCT_IN_CATEGORY",
          marketplace: p.marketplace,
          confidence: 90,
          matchConfidenceTier: "HIGH_CONFIDENCE",
          evidence: {
            explanation: `Product catalog taxonomy categorizes listing under "${p.categoryPath.join(" > ")}".`,
          },
          provenance: p.source || "ACTUAL_DATA",
          sourceResearchRunId: options.researchRunId,
          firstObservedAt: now,
          lastObservedAt: now,
          observationCount: 1,
        });
        edgesAdded++;
      }

      // Keyword Tokens & Edges
      const tokens = (p.title || "")
        .toLowerCase()
        .replace(/[^\w\s-]/g, " ")
        .split(/\s+/)
        .filter((t) => t.length > 3)
        .slice(0, 5);

      for (const t of tokens) {
        const kwId = EntityResolutionEngine.generateKeywordId(t);
        const isNewKw = !this.nodes.has(kwId);
        const kwNode: CanonicalKeywordEntity = {
          id: kwId,
          entityType: "KEYWORD",
          marketplace: "all",
          keyword: t,
          name: t,
          normalizedName: t,
          listingFrequencyPercent: 10,
          observedAveragePrice: p.price ?? null,
          demandProxyScore: 50,
          competitionProxy: "MODERATE",
          searchVolume: null,
          searchVolumeProvenance: "UNAVAILABLE",
          intentCategory: "GENERAL",
          associatedCategories: p.categoryPath ?? [],
          firstObservedAt: now,
          lastObservedAt: now,
          observationCount: 1,
          freshness: evaluateFreshness(now, "general"),
          provenance: p.source || "ACTUAL_DATA",
          organizationId: options.organizationId,
        };
        this.upsertNode(kwNode);
        if (isNewKw) nodesAdded++;

        // Edge: KEYWORD_APPEARS_IN_PRODUCT
        this.addEdge({
          sourceEntityId: kwId,
          sourceEntityType: "KEYWORD",
          targetEntityId: prodNode.id,
          targetEntityType: "PRODUCT",
          relationshipType: "KEYWORD_APPEARS_IN_PRODUCT",
          marketplace: p.marketplace,
          confidence: 95,
          matchConfidenceTier: "EXACT",
          evidence: {
            explanation: `Keyword "${t}" is present in product title.`,
          },
          provenance: p.source || "ACTUAL_DATA",
          sourceResearchRunId: options.researchRunId,
          firstObservedAt: now,
          lastObservedAt: now,
          observationCount: 1,
        });
        edgesAdded++;
      }
    }

    // 2. Cross-Marketplace Product Links
    for (let i = 0; i < canonicalProducts.length; i++) {
      for (let j = i + 1; j < canonicalProducts.length; j++) {
        const prodA = canonicalProducts[i];
        const prodB = canonicalProducts[j];

        if (prodA.marketplace !== prodB.marketplace) {
          const match = EntityResolutionEngine.compareCrossMarketplaceProducts(prodA, prodB);
          if (match.matchTier === "SAME_PRODUCT" || match.matchTier === "POSSIBLE_SAME_PRODUCT") {
            this.addEdge({
              sourceEntityId: prodA.id,
              sourceEntityType: "PRODUCT",
              targetEntityId: prodB.id,
              targetEntityType: "PRODUCT",
              relationshipType: "PRODUCT_MATCHED_ACROSS_MARKETPLACES",
              marketplace: "all",
              confidence: match.confidenceScore,
              matchConfidenceTier: match.confidenceTier,
              crossMarketplaceTier: match.matchTier,
              evidence: {
                matchingFields: match.matchingFields,
                tokenOverlapScore: match.tokenOverlapScore,
                priceDeltaPercent: match.priceDeltaPercent,
                explanation: match.evidenceExplanation,
              },
              provenance: "ACTUAL_DATA",
              sourceResearchRunId: options.researchRunId,
              firstObservedAt: now,
              lastObservedAt: now,
              observationCount: 1,
            });
            edgesAdded++;
          }
        }
      }
    }

    return { nodesAdded, edgesAdded };
  }

  /**
   * Retrieves a node by ID.
   */
  public static getNode(id: string): CanonicalMarketEntity | undefined {
    return this.nodes.get(id);
  }

  /**
   * Retrieves all relationship edges for a node.
   */
  public static getRelationships(
    entityId: string,
    direction: "outgoing" | "incoming" | "both" = "both"
  ): MarketRelationshipEdge[] {
    const edgeIds = new Set<string>();

    if (direction === "outgoing" || direction === "both") {
      const out = this.nodeOutgoingEdges.get(entityId);
      if (out) out.forEach((id) => edgeIds.add(id));
    }

    if (direction === "incoming" || direction === "both") {
      const inc = this.nodeIncomingEdges.get(entityId);
      if (inc) inc.forEach((id) => edgeIds.add(id));
    }

    return Array.from(edgeIds)
      .map((id) => this.edges.get(id))
      .filter((e): e is MarketRelationshipEdge => !!e);
  }

  /**
   * Extracts an interactive subgraph centered around a root entity.
   */
  public static extractSubgraph(rootEntityId: string, maxDepth = 2): SubgraphExtract {
    const root = this.nodes.get(rootEntityId);
    const rootType: MarketEntityType = root ? root.entityType : "PRODUCT";

    const visitedNodes = new Set<string>();
    const extractedEdges = new Map<string, MarketRelationshipEdge>();

    const traverse = (currentId: string, depth: number) => {
      if (depth > maxDepth || visitedNodes.has(currentId)) return;
      visitedNodes.add(currentId);

      const rels = this.getRelationships(currentId, "both");
      for (const rel of rels) {
        extractedEdges.set(rel.id, rel);
        const nextId = rel.sourceEntityId === currentId ? rel.targetEntityId : rel.sourceEntityId;
        traverse(nextId, depth + 1);
      }
    };

    traverse(rootEntityId, 1);

    const nodes = Array.from(visitedNodes)
      .map((id) => this.nodes.get(id))
      .filter((n): n is CanonicalMarketEntity => !!n)
      .map((n) => ({
        id: n.id,
        label: n.name,
        entityType: n.entityType,
        marketplace: n.marketplace,
        metrics: n.entityType === "PRODUCT" ? { price: (n as CanonicalProductEntity).price, rating: (n as CanonicalProductEntity).rating } : undefined,
      }));

    const edges = Array.from(extractedEdges.values()).map((e) => ({
      id: e.id,
      source: e.sourceEntityId,
      target: e.targetEntityId,
      type: e.relationshipType,
      confidence: e.confidence,
      label: e.relationshipType.replace(/_/g, " ").toLowerCase(),
    }));

    return {
      rootEntityId,
      rootEntityType: rootType,
      nodes,
      edges,
      generatedAt: new Date(),
    };
  }

  /**
   * Returns total node count in the graph.
   */
  public static getNodeCount(): number {
    return this.nodes.size;
  }

  /**
   * Returns total edge count in the graph.
   */
  public static getEdgeCount(): number {
    return this.edges.size;
  }
}
