// A SellerChannelConnector talks to ONE customer's own authenticated store —
// different contract from MarketplaceConnector (platform-wide research).
// Deliberately minimal for now: enough to power read-only analytics. Write
// operations (cross-listing) will extend this interface later rather than
// replace it.

export interface SellerOrderResult {
  externalOrderId: string;
  orderNumber?: string;
  totalAmount: number;
  currency: string;
  status: string;
  placedAt: Date;
}

export interface SellerChannelConnector {
  platform: string;
  testConnection(credentials: Record<string, string>, storeUrl: string): Promise<{ ok: boolean; message?: string }>;
  /** Pulls orders placed after `since` (or all recent orders if omitted). */
  fetchRecentOrders(
    credentials: Record<string, string>,
    storeUrl: string,
    since?: Date
  ): Promise<SellerOrderResult[]>;
}
