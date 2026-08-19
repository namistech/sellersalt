import type { MarketplaceId } from "./types";

/** Thrown when a caller invokes a connector method whose capability flag is
 * false. Callers (routes, intelligence engines) should catch this and
 * degrade gracefully — show "not available for this marketplace yet" — never
 * fabricate a result to paper over it. */
export class MarketplaceCapabilityUnavailableError extends Error {
  constructor(
    public readonly marketplace: MarketplaceId,
    public readonly capability: string
  ) {
    super(`${marketplace} connector does not support "${capability}" yet.`);
    this.name = "MarketplaceCapabilityUnavailableError";
  }
}

/** Thrown by a stub connector's methods (Amazon/eBay/TikTok Shop today) —
 * distinct from MarketplaceCapabilityUnavailableError because it signals
 * "this whole connector is architecture-only, no live API integration
 * exists," not "this one operation is unsupported on an otherwise-live
 * connector." */
export class MarketplaceNotImplementedError extends Error {
  constructor(public readonly marketplace: MarketplaceId, detail?: string) {
    super(
      `${marketplace} connector is architecture-ready but has no live API integration yet.` +
        (detail ? ` ${detail}` : "")
    );
    this.name = "MarketplaceNotImplementedError";
  }
}
