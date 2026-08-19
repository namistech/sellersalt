-- Marketplace connector architecture expansion (additive only, no data
-- migration, no destructive changes). Adds enum values so future
-- platform-owned research connectors and seller-channel OAuth accounts for
-- Amazon, eBay, TikTok Shop, Shopify, and WooCommerce can be represented in
-- the database — none of these has a live API integration yet (see
-- src/marketplaces/<id>/connector.ts, all stubs except Etsy). Nothing
-- creates a row using these values until a real connector ships.
--
-- NOTE: this migration was generated alongside unrelated pre-existing schema
-- drift (Announcement.updatedAt default, Coupon column defaults, a missing
-- AnnouncementRead FK) that predates this change and is intentionally NOT
-- included here — see /docs/SELLERSALT-ARCHITECTURE-AUDIT.md, "Pre-existing
-- schema drift" for that separate, flagged issue.

-- AlterEnum
ALTER TYPE "ConnectorType" ADD VALUE 'AMAZON';
ALTER TYPE "ConnectorType" ADD VALUE 'EBAY';
ALTER TYPE "ConnectorType" ADD VALUE 'TIKTOK_SHOP';
ALTER TYPE "ConnectorType" ADD VALUE 'SHOPIFY';
ALTER TYPE "ConnectorType" ADD VALUE 'WOOCOMMERCE';

-- AlterEnum
ALTER TYPE "SellerChannelPlatform" ADD VALUE 'AMAZON_SELLER';
ALTER TYPE "SellerChannelPlatform" ADD VALUE 'TIKTOK_SHOP_SELLER';
