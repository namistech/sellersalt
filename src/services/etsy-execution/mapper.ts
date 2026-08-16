import type { ListingDraftPayload } from "@/types/listing-draft";

export interface EtsyValidationIssue {
  field: string;
  code: string;
  message: string;
}

export interface EtsyPreflightValidationResult {
  isValid: boolean;
  issues: EtsyValidationIssue[];
}

export interface EtsyListingApiPayload {
  quantity: number;
  title: string;
  description: string;
  price: number;
  who_made: "i_did" | "someone_else" | "collective";
  when_made: string;
  taxonomy_id?: number;
  tags: string[];
  materials: string[];
  is_supply: boolean;
  is_customizable: boolean;
  state: "draft" | "active";
}

/**
 * Pre-flight validation gate for Etsy Open API v3 Listing Creation.
 * Verifies all hard limits before invoking network requests.
 */
export function validateEtsyListingPayload(draft: {
  title?: string;
  description?: string;
  tags?: string[];
  materials?: string[];
  price?: number;
  quantity?: number;
  taxonomyId?: number | null;
  whoMade?: string;
  whenMade?: string;
  state?: string;
}): EtsyPreflightValidationResult {
  const issues: EtsyValidationIssue[] = [];

  // 1. Title validation
  const title = (draft.title || "").trim();
  if (!title) {
    issues.push({ field: "title", code: "TITLE_REQUIRED", message: "Title is required for Etsy listing." });
  } else if (title.length > 140) {
    issues.push({ field: "title", code: "TITLE_TOO_LONG", message: `Title is ${title.length} characters (maximum 140).` });
  }

  // 2. Tags validation
  const tags = Array.isArray(draft.tags) ? draft.tags : [];
  if (tags.length === 0) {
    issues.push({ field: "tags", code: "TAGS_REQUIRED", message: "At least 1 tag is required." });
  } else if (tags.length > 13) {
    issues.push({ field: "tags", code: "TAGS_OVER_LIMIT", message: `Found ${tags.length} tags (maximum 13 allowed).` });
  }

  const seenTags = new Set<string>();
  for (const tag of tags) {
    const clean = (tag || "").trim().toLowerCase();
    if (clean.length > 20) {
      issues.push({ field: "tags", code: "TAG_TOO_LONG", message: `Tag "${tag}" exceeds 20 characters.` });
    }
    if (seenTags.has(clean)) {
      issues.push({ field: "tags", code: "DUPLICATE_TAG", message: `Duplicate tag found: "${tag}".` });
    }
    seenTags.add(clean);
  }

  // 3. Price validation
  if (typeof draft.price !== "number" || isNaN(draft.price) || draft.price <= 0) {
    issues.push({ field: "price", code: "INVALID_PRICE", message: "Price must be a positive number." });
  }

  // 4. Quantity validation
  if (typeof draft.quantity !== "number" || isNaN(draft.quantity) || draft.quantity < 1) {
    issues.push({ field: "quantity", code: "INVALID_QUANTITY", message: "Quantity must be at least 1." });
  }

  // 5. Taxonomy validation
  if (draft.taxonomyId !== undefined && draft.taxonomyId !== null) {
    if (typeof draft.taxonomyId !== "number" || draft.taxonomyId <= 0) {
      issues.push({ field: "taxonomyId", code: "INVALID_TAXONOMY", message: "Taxonomy ID must be a positive integer." });
    }
  }

  return {
    isValid: issues.length === 0,
    issues,
  };
}

/**
 * Maps a SellerSalt ListingDraft into an Etsy Open API v3 request body.
 * Strips all internal database identifiers and confidential metadata.
 */
export function mapDraftToEtsyPayload(draft: {
  title: string;
  description: string;
  tags: string[];
  materials?: string[];
  price: number;
  quantity?: number;
  taxonomyId?: number | null;
  whoMade?: string;
  whenMade?: string;
  isSupply?: boolean;
  isCustomizable?: boolean;
  state?: string;
}): EtsyListingApiPayload {
  const whoMade = ["i_did", "someone_else", "collective"].includes(draft.whoMade || "")
    ? (draft.whoMade as "i_did" | "someone_else" | "collective")
    : "i_did";

  const whenMade = draft.whenMade || "2020_2026";
  const state = draft.state === "active" ? "active" : "draft";

  const payload: EtsyListingApiPayload = {
    title: draft.title.trim().slice(0, 140),
    description: (draft.description || "").trim(),
    tags: (draft.tags || []).map((t) => t.trim().toLowerCase().slice(0, 20)).slice(0, 13),
    materials: (draft.materials || []).map((m) => m.trim()).filter(Boolean),
    price: Number(draft.price.toFixed(2)),
    quantity: typeof draft.quantity === "number" && draft.quantity >= 1 ? draft.quantity : 999,
    who_made: whoMade,
    when_made: whenMade,
    is_supply: Boolean(draft.isSupply),
    is_customizable: Boolean(draft.isCustomizable),
    state,
  };

  if (draft.taxonomyId) {
    payload.taxonomy_id = Number(draft.taxonomyId);
  }

  return payload;
}
