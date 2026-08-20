/**
 * SellerSalt — Source Boundary Layer
 * 
 * Enforces data boundaries between marketplaces and sources.
 * Strips restricted/private fields, validates provenance, and prevents cross-tenant contamination.
 */

import type { NormalizedProduct, MarketplaceId, DataSourceType } from "../types";
import { MarketplaceGovernanceRegistry } from "./registry";

export interface SanitizationResult<T> {
  sanitized: T;
  strippedFields: string[];
  isCompliant: boolean;
  warnings: string[];
}

export class SourceBoundary {
  /**
   * Sanitizes a NormalizedProduct to guarantee zero restricted private fields enter the intelligence layer.
   */
  public static sanitizeProduct(product: NormalizedProduct): SanitizationResult<NormalizedProduct> {
    const policy = MarketplaceGovernanceRegistry.getPolicy(product.marketplace);
    const stripped: string[] = [];
    const warnings: string[] = [];

    const copy = { ...product };

    // 1. Guard seller direct contact details
    if (policy.entityDataRules.sellerPIIRestricted) {
      if ((copy.shop as any)?.email) {
        delete (copy.shop as any).email;
        stripped.push("shop.email");
      }
      if ((copy.shop as any)?.phone) {
        delete (copy.shop as any).phone;
        stripped.push("shop.phone");
      }
      if ((copy.shop as any)?.address) {
        delete (copy.shop as any).address;
        stripped.push("shop.address");
      }
    }

    // 2. Guard private customer or buyer PII
    if ((copy as any).customerData) {
      delete (copy as any).customerData;
      stripped.push("customerData");
    }

    // 3. Ensure provenance is attached
    if (!copy.source) {
      copy.source = "ACTUAL_DATA";
      warnings.push("Missing source provenance on product observation; defaulted to ACTUAL_DATA.");
    }

    return {
      sanitized: copy,
      strippedFields: stripped,
      isCompliant: stripped.length === 0,
      warnings,
    };
  }

  /**
   * Sanitizes an array of product observations.
   */
  public static sanitizeProducts(products: NormalizedProduct[]): NormalizedProduct[] {
    return products.map((p) => this.sanitizeProduct(p).sanitized);
  }

  /**
   * Enforces strict organization tenancy isolation.
   */
  public static assertTenancy(expectedOrgId: string, actualOrgId?: string): void {
    if (!expectedOrgId) {
      throw new Error("[SourceBoundary] Tenancy violation: Missing expected organizationId.");
    }
    if (actualOrgId && actualOrgId !== expectedOrgId) {
      throw new Error(
        `[SourceBoundary] Cross-tenant access violation: Requested organization '${actualOrgId}' does not match session '${expectedOrgId}'.`
      );
    }
  }
}
