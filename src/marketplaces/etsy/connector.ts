// The Etsy marketplace connector: the one marketplace with a fully live
// integration. This file does not talk to Etsy's API itself — it adapts the
// two existing, working Etsy integrations into the unified
// MarketplaceConnector shape:
//   - src/connectors/etsy (platform-owned public research: search, shop
//     stats, taxonomy — real Etsy Open API v3 calls)
//   - src/seller-channels/etsy-seller (one customer's own OAuth-connected
//     shop: orders today)
//   - src/services/etsy-execution (draft creation / update / publish against
//     the connected seller's own shop, human-approval-gated)
//
// OAuth itself (PKCE authorize/callback/token-refresh) is NOT reachable
// through connector.authenticate() — it's a redirect-based browser flow that
// lives in src/app/api/seller-channels/etsy/{connect,callback}/route.ts and
// doesn't fit a synchronous "pass credentials, get an account back" call.
// authenticate/disconnect are intentionally left undefined here rather than
// faked; see /docs/MARKETPLACE-INTEGRATION-MATRIX.md.

import { prisma } from "@/lib/db";
import { getConnector as getResearchConnector } from "@/connectors/registry";
import { getSellerChannelConnector } from "@/seller-channels/registry";
import { getActiveConnectorWithCredentials } from "@/lib/get-active-connector";
import { decrypt } from "@/lib/encryption";
import { updateEtsyListing as executeUpdateEtsyListing } from "@/services/etsy-execution/execution-service";
import {
  normalizeEtsyProspectToSearchResult,
  normalizeEtsyProspectToNormalizedProduct,
  normalizeEtsyShopStats,
  normalizeEtsySellerOrder,
} from "../core/normalizers/etsy";
import { withCapabilities } from "../core/capabilities";
import type { MarketplaceConnector, MarketplaceResearchQuery } from "../core/interfaces";
import type { MarketplaceAccount, MarketplaceShop, Order, Listing, SearchResult, NormalizedProduct } from "../core/types";

const researchConnector = getResearchConnector("ETSY");
const sellerConnector = getSellerChannelConnector("ETSY_SELLER");

async function loadChannel(marketplaceAccountId: string) {
  return prisma.sellerChannel.findUnique({ where: { id: marketplaceAccountId } });
}

/**
 * Resolves real Etsy API credentials for public/platform-owned research —
 * an org's own dedicated connector if they have one, otherwise the shared
 * platform connector (organizationId: null in the Connector table). This is
 * the fix for a real defect found while wiring the scheduled research
 * pipeline: the search/shop-stats methods below previously called Etsy's
 * API with an empty `{}` credentials object, which would have failed
 * against the real API the first time anything actually invoked them.
 *
 * Passing `organizationId: undefined` (no org context — e.g. an anonymous
 * public shop lookup) intentionally resolves to the shared platform
 * connector only, matching the "research works without a connected seller
 * account" architecture principle.
 */
async function resolveResearchCredentials(organizationId: string | undefined) {
  const active = await getActiveConnectorWithCredentials(organizationId ?? "", "ETSY");
  if (!active?.credentials?.apiKey) {
    throw new Error("No active Etsy research connector is configured. Configure one in Admin -> Site Settings.");
  }
  return active;
}

export const etsyConnector: MarketplaceConnector = {
  marketplace: "etsy",
  displayName: "Etsy",

  capabilities: withCapabilities({
    research: true,
    keywordResearch: true,
    categoryTaxonomy: true,
    accountAuth: true,
    readShops: true,
    readOrders: true,
    // Products/listings/inventory reads for the connected seller's own shop
    // aren't wired through this adapter yet (the existing app reads them via
    // dedicated /studio and /drafts routes, not a generic getListings call) —
    // left false rather than claimed, see integration matrix.
    readProducts: false,
    readListings: false,
    readInventory: false,
    readAnalytics: false,
    createListing: true,
    updateListing: true,
    publishListing: false, // silent auto-publish is deliberately never supported
  }),

  async getAccount(marketplaceAccountId) {
    const channel = await loadChannel(marketplaceAccountId);
    if (!channel || channel.platform !== "ETSY_SELLER") return null;
    return toMarketplaceAccount(channel);
  },

  async getShops(marketplaceAccountId) {
    const channel = await loadChannel(marketplaceAccountId);
    if (!channel || channel.platform !== "ETSY_SELLER") return [];
    // The connected channel *is* the shop for Etsy — one seller channel maps
    // to exactly one Etsy shop today.
    const shop: MarketplaceShop = {
      marketplace: "etsy",
      externalId: channel.storeUrl,
      marketplaceAccountId: channel.id,
      name: channel.label,
      url: channel.storeUrl,
    };
    return [shop];
  },

  async getOrders(marketplaceAccountId, since) {
    const channel = await loadChannel(marketplaceAccountId);
    if (!channel || channel.platform !== "ETSY_SELLER") return [];
    const credentials = JSON.parse(decrypt(channel.encryptedCredentials));
    const results = await sellerConnector.fetchRecentOrders(credentials, channel.storeUrl, since);
    return results.map((r) => normalizeEtsySellerOrder(marketplaceAccountId, r));
  },

  // IMPORTANT: this does NOT push to Etsy. Etsy requires a human-approved
  // ListingDraft (draft.status === APPROVED) before createEtsyDraftListing
  // will push anything — that gate is load-bearing (no silent publish is a
  // hard product/compliance rule, not an implementation detail), so a
  // generic createListing() call can never skip it by creating-and-pushing
  // in one step. This creates the local, reviewable draft only; pushing it
  // live is a separate, explicit, human-approved action
  // (src/services/etsy-execution/execution-service.ts's
  // createEtsyDraftListing, called from the Studio UI after approval).
  async createListing(marketplaceAccountId, listing) {
    if (!listing.title || typeof listing.price !== "number") {
      throw new Error("Etsy listing creation requires at least title and price.");
    }
    const channel = await loadChannel(marketplaceAccountId);
    if (!channel) throw new Error("Etsy seller channel not found.");

    const draft = await prisma.listingDraft.create({
      data: {
        organizationId: channel.organizationId,
        sellerChannelId: channel.id,
        title: listing.title,
        description: listing.description ?? "",
        price: listing.price,
        quantity: listing.quantity ?? 999,
        tags: listing.tags ?? [],
        status: "DRAFT",
      },
    });

    return {
      marketplace: "etsy",
      externalId: draft.id,
      marketplaceAccountId,
      title: draft.title,
      description: draft.description,
      price: draft.price,
      currency: "USD",
      status: "draft",
      tags: draft.tags,
      quantity: draft.quantity,
      metadata: { pendingHumanApproval: true, sellerSaltDraftId: draft.id },
    };
  },

  // Requires `externalId` to be an Etsy listing ID that a prior approved
  // push already produced (draft.etsyListingId) — updating a listing that
  // was never approved and pushed makes no sense and this will throw.
  async updateListing(marketplaceAccountId, externalId, patch) {
    const channel = await loadChannel(marketplaceAccountId);
    if (!channel) throw new Error("Etsy seller channel not found.");

    const draft = await prisma.listingDraft.findFirst({
      where: { sellerChannelId: channel.id, etsyListingId: externalId },
    });
    if (!draft) {
      throw new Error(`No pushed draft found for Etsy listing ${externalId} — cannot update.`);
    }

    if (patch.title || patch.description || typeof patch.price === "number" || patch.tags) {
      await prisma.listingDraft.update({
        where: { id: draft.id },
        data: {
          ...(patch.title ? { title: patch.title } : {}),
          ...(patch.description ? { description: patch.description } : {}),
          ...(typeof patch.price === "number" ? { price: patch.price } : {}),
          ...(patch.tags ? { tags: patch.tags } : {}),
        },
      });
    }

    const result = await executeUpdateEtsyListing({
      organizationId: channel.organizationId,
      listingDraftId: draft.id,
      sellerChannelId: channel.id,
    });

    if (!result.success) {
      throw new Error(result.errorMessage || "Etsy listing update failed.");
    }

    return toCanonicalListing(marketplaceAccountId, externalId, patch);
  },

  async searchPublicListings(query: MarketplaceResearchQuery): Promise<SearchResult[]> {
    if (!query.keywords?.length) return [];
    const { credentials } = await resolveResearchCredentials(query.organizationId);
    const results = await researchConnector.runSearch(credentials, {
      keywords: query.keywords,
      minPrice: query.minPrice ?? 0,
      maxPrice: query.maxPrice ?? 1_000_000,
      minShopAgeMonths: 0,
      maxShopAgeMonths: 1200,
      minReviewCount: 0,
    });
    const limited = query.limit ? results.slice(0, query.limit) : results;
    return limited.map(normalizeEtsyProspectToSearchResult);
  },

  // Richer than searchPublicListings — used by the scheduled Prospects
  // pipeline (src/workers/index.ts), which needs shop/review/sales metrics
  // to populate the Prospect table, not just a title/price/url preview.
  async searchProducts(query: MarketplaceResearchQuery): Promise<NormalizedProduct[]> {
    if (!query.keywords?.length) return [];
    const { credentials } = await resolveResearchCredentials(query.organizationId);
    const results = await researchConnector.runSearch(credentials, {
      keywords: query.keywords,
      minPrice: query.minPrice ?? 0,
      maxPrice: query.maxPrice ?? 1_000_000,
      minShopAgeMonths: query.minShopAgeMonths ?? 0,
      maxShopAgeMonths: query.maxShopAgeMonths ?? 1200,
      minReviewCount: query.minReviewCount ?? 0,
    });
    const limited = query.limit ? results.slice(0, query.limit) : results;
    return limited.map(normalizeEtsyProspectToNormalizedProduct);
  },

  async getPublicShopStats(shopExternalId) {
    if (!researchConnector.getShopByName) return null;
    const { credentials } = await resolveResearchCredentials(undefined);
    const stats = await researchConnector.getShopByName(credentials, shopExternalId);
    return stats ? normalizeEtsyShopStats(stats) : null;
  },
};

function toMarketplaceAccount(channel: {
  id: string;
  organizationId: string;
  label: string;
  storeUrl: string;
  status: string;
  createdAt: Date;
}): MarketplaceAccount {
  return {
    marketplace: "etsy",
    externalId: channel.storeUrl,
    marketplaceAccountId: channel.id,
    organizationId: channel.organizationId,
    label: channel.label,
    storeUrl: channel.storeUrl,
    connectedAt: channel.createdAt,
    status: channel.status as MarketplaceAccount["status"],
  };
}

function toCanonicalListing(marketplaceAccountId: string, externalId: string, source: Partial<Listing>): Listing {
  return {
    marketplace: "etsy",
    externalId,
    marketplaceAccountId,
    title: source.title ?? "",
    description: source.description,
    price: source.price ?? 0,
    currency: "USD",
    status: "draft",
    tags: source.tags,
    quantity: source.quantity,
  };
}
