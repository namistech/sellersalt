"use client";

import React, { useState } from "react";
import {
  Sparkles,
  Store,
  Bot,
  Zap,
  Briefcase,
  Layers,
  Search,
  Filter,
  CheckCircle2,
} from "lucide-react";
import { IntegrationCard, type IntegrationCardProps } from "@/components/admin/IntegrationCard";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

interface SettingItem {
  key: string;
  label: string;
  isSecret: boolean;
  hasValue: boolean;
  value?: string;
}

interface IntegrationsViewProps {
  settings: SettingItem[];
  onSaveSetting: (key: string, value: string) => Promise<boolean>;
  onRefreshSettings?: () => Promise<void>;
  appBaseUrl?: string;
}

export function IntegrationsView({
  settings,
  onSaveSetting,
  onRefreshSettings,
  appBaseUrl,
}: IntegrationsViewProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const getVal = (key: string) => settings.find((s) => s.key === key)?.value || "";
  const hasVal = (key: string) => {
    const s = settings.find((item) => item.key === key);
    return Boolean(s?.hasValue || s?.value);
  };

  const handleBulkSave = async (updates: Record<string, string>) => {
    for (const [k, v] of Object.entries(updates)) {
      if (v !== getVal(k)) {
        await onSaveSetting(k, v);
      }
    }
    if (onRefreshSettings) {
      await onRefreshSettings();
    }
    return true;
  };

  const PROD_BASE = "https://sellersalt.com";
  const STAGING_BASE = "https://staging.sellersalt.com";

  // Integration card definitions
  const integrations: Omit<IntegrationCardProps, "onSave">[] = [
    // 1. Google OAuth & APIs
    {
      id: "google-oauth",
      category: "Productivity",
      name: "Google OAuth & Identity",
      description:
        "Enables 1-click Google Sign-In and account linking for all sellers. Configures Google Client ID & Secret.",
      icon: "🌐",
      status: hasVal("google_client_id") && hasVal("google_client_secret") ? "CONFIGURED" : "NOT_CONFIGURED",
      documentationUrl: "https://console.cloud.google.com/apis/credentials",
      documentationLabel: "Google Cloud Console",
      callbackUrls: [
        {
          label: "Production Authorized Redirect URI",
          description: "Add to Google Cloud OAuth 2.0 Client",
          url: `${PROD_BASE}/api/auth/callback/google`,
        },
        {
          label: "Staging Authorized Redirect URI",
          description: "Add to Google Cloud OAuth 2.0 Client",
          url: `${STAGING_BASE}/api/auth/callback/google`,
        },
      ],
      fields: [
        {
          key: "google_client_id",
          label: "Google Client ID",
          placeholder: "xxxx.apps.googleusercontent.com",
          value: getVal("google_client_id"),
          hasValue: hasVal("google_client_id"),
          instructions: "From Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 Client IDs.",
        },
        {
          key: "google_client_secret",
          label: "Google Client Secret",
          isSecret: true,
          value: getVal("google_client_secret"),
          hasValue: hasVal("google_client_secret"),
          instructions: "Keep confidential. Saved encrypted in the database.",
        },
      ],
      onTestConnection: async () => {
        try {
          const res = await fetch("/api/admin/diagnostics/google-oauth");
          const data = await res.json();
          if (data.configured) {
            return { ok: true, message: `Google OAuth client ready. Client ID prefix: ${data.clientIdPrefix}...` };
          }
          return { ok: false, message: data.error || "Google OAuth client credentials missing." };
        } catch (e: any) {
          return { ok: false, message: e.message || "Failed to query Google OAuth status." };
        }
      },
    },

    // 2. Etsy Open API v3
    {
      id: "etsy-channel",
      category: "Marketplace",
      name: "Etsy Open API v3",
      description:
        "Official Etsy Open API v3 connector with PKCE authorization, inventory sync, and draft publishing.",
      icon: "🧡",
      provenanceBadge: "[ACTUAL ETSY DATA]",
      status: hasVal("etsy_seller_client_id") && hasVal("etsy_seller_client_secret") ? "CONFIGURED" : "NOT_CONFIGURED",
      documentationUrl: "https://www.etsy.com/developers/your-apps",
      documentationLabel: "Etsy Developer Portal",
      callbackUrls: [
        {
          label: "Production Channel Callback URL",
          description: "Etsy Dev Portal → App Details → Callback URLs",
          url: `${PROD_BASE}/api/seller-channels/etsy/callback`,
        },
        {
          label: "Staging Channel Callback URL",
          description: "Etsy Dev Portal → App Details → Callback URLs",
          url: `${STAGING_BASE}/api/seller-channels/etsy/callback`,
        },
        {
          label: "NextAuth Login Callback URL",
          description: "Etsy Dev Portal → App Details → Callback URLs",
          url: `${PROD_BASE}/api/auth/callback/etsy`,
        },
      ],
      fields: [
        {
          key: "etsy_seller_client_id",
          label: "Etsy Keystring (Client ID)",
          placeholder: "keystring_from_etsy_app",
          value: getVal("etsy_seller_client_id"),
          hasValue: hasVal("etsy_seller_client_id"),
          instructions: "Copy 'Keystring' from your registered Etsy Developer App details.",
        },
        {
          key: "etsy_seller_client_secret",
          label: "Etsy Shared Secret",
          isSecret: true,
          value: getVal("etsy_seller_client_secret"),
          hasValue: hasVal("etsy_seller_client_secret"),
          instructions: "Copy 'Shared Secret' from your Etsy Developer App details.",
        },
        {
          key: "etsy_oauth_scopes",
          label: "OAuth Requested Scopes Override (Optional)",
          placeholder: "listings_w listings_r shops_r transactions_r",
          value: getVal("etsy_oauth_scopes"),
          hasValue: hasVal("etsy_oauth_scopes"),
          instructions: "Default scopes: listings_w listings_r shops_r transactions_r billing_r.",
        },
      ],
      onTestConnection: async () => {
        try {
          const res = await fetch("/api/admin/diagnostics/etsy-oauth");
          const data = await res.json();
          if (data.configured) {
            return { ok: true, message: `Etsy Open API v3 app verified. Scopes: ${data.scopes}` };
          }
          return { ok: false, message: data.error || "Etsy keystring missing." };
        } catch (e: any) {
          return { ok: false, message: e.message || "Failed to query Etsy status." };
        }
      },
    },

    // 3. Shopify Multi-Channel
    {
      id: "shopify-channel",
      category: "Marketplace",
      name: "Shopify Multi-Channel",
      description:
        "Multi-channel catalog sync, automated cross-listing, and Netdrix affiliate store ordering pipeline.",
      icon: "🛍️",
      status: hasVal("shopify_client_id") && hasVal("shopify_client_secret") ? "CONFIGURED" : "NOT_CONFIGURED",
      documentationUrl: "https://partners.shopify.com",
      documentationLabel: "Shopify Partners Console",
      callbackUrls: [
        {
          label: "Production OAuth Callback URL",
          url: `${PROD_BASE}/api/seller-channels/shopify/callback`,
        },
        {
          label: "Staging OAuth Callback URL",
          url: `${STAGING_BASE}/api/seller-channels/shopify/callback`,
        },
      ],
      fields: [
        {
          key: "shopify_client_id",
          label: "Shopify App Client ID",
          placeholder: "shpa_xxxx...",
          value: getVal("shopify_client_id"),
          hasValue: hasVal("shopify_client_id"),
          instructions: "From Shopify Partners → Apps → App Setup → Client credentials.",
        },
        {
          key: "shopify_client_secret",
          label: "Shopify App Client Secret",
          isSecret: true,
          value: getVal("shopify_client_secret"),
          hasValue: hasVal("shopify_client_secret"),
          instructions: "Encrypted secret used for token exchange.",
        },
        {
          key: "shopify_affiliate_url",
          label: "Shopify Affiliate Referral URL",
          placeholder: "https://shopify.pxf.io/...",
          value: getVal("shopify_affiliate_url"),
          hasValue: hasVal("shopify_affiliate_url"),
          instructions: "Your Shopify affiliate partner link embedded in store creation buttons.",
        },
      ],
    },

    // 4. Amazon SP-API
    {
      id: "amazon-spapi",
      category: "Marketplace",
      name: "Amazon SP-API",
      description:
        "Amazon Selling Partner API (SP-API) for multi-channel listings, catalog lookups, and inventory tracking.",
      icon: "📦",
      status: hasVal("amazon_client_id") && hasVal("amazon_client_secret") ? "CONFIGURED" : "NOT_CONFIGURED",
      documentationUrl: "https://developer-docs.amazon.com/sp-api/",
      documentationLabel: "Amazon SP-API Developer Center",
      callbackUrls: [
        {
          label: "Production LWA Redirect URL",
          url: `${PROD_BASE}/api/seller-channels/amazon/callback`,
        },
      ],
      fields: [
        {
          key: "amazon_client_id",
          label: "LWA Client ID (Login with Amazon)",
          placeholder: "amzn1.application-oa2-client.xxxx",
          value: getVal("amazon_client_id"),
          hasValue: hasVal("amazon_client_id"),
          instructions: "From Amazon Developer Console → Login with Amazon (LWA) app.",
        },
        {
          key: "amazon_client_secret",
          label: "LWA Client Secret",
          isSecret: true,
          value: getVal("amazon_client_secret"),
          hasValue: hasVal("amazon_client_secret"),
          instructions: "LWA client secret from Amazon Developer Console.",
        },
        {
          key: "amazon_region",
          label: "Default Marketplace Region",
          placeholder: "NA",
          value: getVal("amazon_region"),
          hasValue: hasVal("amazon_region"),
          type: "select",
          options: [
            { label: "North America (US, CA, MX, BR)", value: "NA" },
            { label: "Europe (UK, DE, FR, IT, ES)", value: "EU" },
            { label: "Far East (JP, AU, SG)", value: "FE" },
          ],
          instructions: "Target region endpoint for Selling Partner REST calls.",
        },
      ],
    },

    // 5. TikTok Shop
    {
      id: "tiktok-shop",
      category: "Marketplace",
      name: "TikTok Shop Partner API",
      description:
        "Direct connection to TikTok Shop Partner Center for viral product tracking, inventory, and cross-channel sync.",
      icon: "🎵",
      status: hasVal("tiktok_app_key") && hasVal("tiktok_app_secret") ? "CONFIGURED" : "NOT_CONFIGURED",
      documentationUrl: "https://partner.tiktokshop.com",
      documentationLabel: "TikTok Shop Partner Center",
      callbackUrls: [
        {
          label: "Production Authorized Redirect URL",
          url: `${PROD_BASE}/api/seller-channels/tiktok/callback`,
        },
      ],
      fields: [
        {
          key: "tiktok_app_key",
          label: "TikTok Shop App Key",
          placeholder: "6a8b...",
          value: getVal("tiktok_app_key"),
          hasValue: hasVal("tiktok_app_key"),
          instructions: "App Key issued in TikTok Shop Developer Console.",
        },
        {
          key: "tiktok_app_secret",
          label: "TikTok Shop App Secret",
          isSecret: true,
          value: getVal("tiktok_app_secret"),
          hasValue: hasVal("tiktok_app_secret"),
          instructions: "Secret key for signature verification and token exchange.",
        },
      ],
    },

    // 6. eBay REST API
    {
      id: "ebay-channel",
      category: "Marketplace",
      name: "eBay REST API",
      description:
        "eBay Developer Program integration for cross-marketplace listing sync and price surveillance.",
      icon: "🏷️",
      status: hasVal("ebay_app_id") && hasVal("ebay_cert_id") ? "CONFIGURED" : "NOT_CONFIGURED",
      documentationUrl: "https://developer.ebay.com",
      documentationLabel: "eBay Developers Program",
      callbackUrls: [
        {
          label: "Production RuName Redirect URL",
          url: `${PROD_BASE}/api/seller-channels/ebay/callback`,
        },
      ],
      fields: [
        {
          key: "ebay_app_id",
          label: "eBay App ID (Client ID)",
          placeholder: "YourName-App-PRD-xxxx",
          value: getVal("ebay_app_id"),
          hasValue: hasVal("ebay_app_id"),
          instructions: "From eBay Developer Portal → Application Keysets.",
        },
        {
          key: "ebay_cert_id",
          label: "eBay Cert ID (Client Secret)",
          isSecret: true,
          value: getVal("ebay_cert_id"),
          hasValue: hasVal("ebay_cert_id"),
          instructions: "Encrypted Cert ID for OAuth token generation.",
        },
        {
          key: "ebay_ru_name",
          label: "eBay RuName (Redirect URL Name)",
          placeholder: "YourName-YourName-App-PRD-...",
          value: getVal("ebay_ru_name"),
          hasValue: hasVal("ebay_ru_name"),
          instructions: "Registered RuName matching the redirect URL.",
        },
      ],
    },

    // 7. WooCommerce
    {
      id: "woocommerce-channel",
      category: "Marketplace",
      name: "WooCommerce REST API",
      description:
        "Self-hosted WordPress WooCommerce store connector for catalog imports, stock sync, and price management.",
      icon: "🏪",
      status: hasVal("woocommerce_consumer_key") && hasVal("woocommerce_consumer_secret") ? "CONFIGURED" : "NOT_CONFIGURED",
      documentationUrl: "https://woocommerce.com/document/woocommerce-rest-api/",
      documentationLabel: "WooCommerce REST Docs",
      fields: [
        {
          key: "woocommerce_store_url",
          label: "Store URL",
          placeholder: "https://shop.example.com",
          value: getVal("woocommerce_store_url"),
          hasValue: hasVal("woocommerce_store_url"),
          instructions: "Canonical base URL of the WooCommerce WordPress instance.",
        },
        {
          key: "woocommerce_consumer_key",
          label: "Consumer Key",
          placeholder: "ck_xxxxxxxx...",
          value: getVal("woocommerce_consumer_key"),
          hasValue: hasVal("woocommerce_consumer_key"),
          instructions: "From WooCommerce → Settings → Advanced → REST API.",
        },
        {
          key: "woocommerce_consumer_secret",
          label: "Consumer Secret",
          isSecret: true,
          value: getVal("woocommerce_consumer_secret"),
          hasValue: hasVal("woocommerce_consumer_secret"),
          instructions: "From WooCommerce → Settings → Advanced → REST API.",
        },
      ],
    },

    // 8. Walmart Marketplace
    {
      id: "walmart-channel",
      category: "Marketplace",
      name: "Walmart Marketplace API",
      description:
        "Walmart Developer Portal connector for cross-listing and marketplace surveillance.",
      icon: "⭐",
      status: hasVal("walmart_client_id") && hasVal("walmart_client_secret") ? "CONFIGURED" : "NOT_CONFIGURED",
      documentationUrl: "https://developer.walmart.com",
      documentationLabel: "Walmart Developer Portal",
      fields: [
        {
          key: "walmart_client_id",
          label: "Walmart Client ID",
          placeholder: "walmart_client_id_xxxx",
          value: getVal("walmart_client_id"),
          hasValue: hasVal("walmart_client_id"),
          instructions: "From Walmart Developer Portal → API Keys.",
        },
        {
          key: "walmart_client_secret",
          label: "Walmart Client Secret",
          isSecret: true,
          value: getVal("walmart_client_secret"),
          hasValue: hasVal("walmart_client_secret"),
          instructions: "Keep secret. Used for bearer auth token generation.",
        },
      ],
    },

    // 9. Google Sheets Connector
    {
      id: "google-sheets",
      category: "Productivity",
      name: "Google Sheets Export",
      description:
        "Direct export of keyword surveillance tables, shop dossiers, and SEO audits into Google Sheets.",
      icon: "📊",
      status: hasVal("google_sheets_client_id") ? "CONFIGURED" : "NOT_CONFIGURED",
      documentationUrl: "https://developers.google.com/sheets/api",
      documentationLabel: "Google Sheets API Docs",
      callbackUrls: [
        {
          label: "Production Sheets OAuth Callback",
          url: `${PROD_BASE}/api/connectors/google-sheets/callback`,
        },
      ],
      fields: [
        {
          key: "google_sheets_client_id",
          label: "Google Sheets OAuth Client ID",
          placeholder: "xxxx.apps.googleusercontent.com",
          value: getVal("google_sheets_client_id"),
          hasValue: hasVal("google_sheets_client_id"),
          instructions: "From Google Cloud Console with Google Sheets API enabled.",
        },
        {
          key: "google_sheets_client_secret",
          label: "Google Sheets OAuth Client Secret",
          isSecret: true,
          value: getVal("google_sheets_client_secret"),
          hasValue: hasVal("google_sheets_client_secret"),
          instructions: "Client secret for Google Sheets API token handshake.",
        },
      ],
    },

    // 10. Zapier
    {
      id: "zapier-automation",
      category: "Productivity",
      name: "Zapier",
      description:
        "Connect SellerSalt events (e.g. competitor price change, low stock, SEO score drop) to 5,000+ apps.",
      icon: "⚡",
      status: hasVal("zapier_webhook_url") || hasVal("zapier_client_id") ? "CONFIGURED" : "NOT_CONFIGURED",
      documentationUrl: "https://zapier.com/developer",
      documentationLabel: "Zapier Developer Platform",
      fields: [
        {
          key: "zapier_webhook_url",
          label: "Zapier Inbound Catch Hook URL",
          placeholder: "https://hooks.zapier.com/hooks/catch/xxxx/yyyy",
          value: getVal("zapier_webhook_url"),
          hasValue: hasVal("zapier_webhook_url"),
          instructions: "Webhook URL to receive triggered alerts from SellerSalt.",
        },
        {
          key: "zapier_client_id",
          label: "Zapier Partner Client ID (Optional)",
          placeholder: "zapier_client_id",
          value: getVal("zapier_client_id"),
          hasValue: hasVal("zapier_client_id"),
          instructions: "For custom OAuth-based private Zapier apps.",
        },
      ],
    },

    // 11. Make / Integromat
    {
      id: "make-automation",
      category: "Productivity",
      name: "Make (Integromat)",
      description:
        "Visual automation workflows for custom seller operations, multi-step listing syndication, and notifications.",
      icon: "🔄",
      status: hasVal("make_webhook_url") ? "CONFIGURED" : "NOT_CONFIGURED",
      documentationUrl: "https://www.make.com/en/help",
      documentationLabel: "Make Developer Docs",
      fields: [
        {
          key: "make_webhook_url",
          label: "Make Webhook Hook URL",
          placeholder: "https://hook.eu1.make.com/xxxx...",
          value: getVal("make_webhook_url"),
          hasValue: hasVal("make_webhook_url"),
          instructions: "Custom Webhook module endpoint from your Make scenario.",
        },
      ],
    },

    // 12. Slack
    {
      id: "slack-notifications",
      category: "Productivity",
      name: "Slack Notifications & Bot",
      description:
        "Broadcast competitor surveillance alerts, daily shop summaries, and sales spikes directly to Slack channels.",
      icon: "💬",
      status: hasVal("slack_webhook_url") || hasVal("slack_bot_token") ? "CONFIGURED" : "NOT_CONFIGURED",
      documentationUrl: "https://api.slack.com/apps",
      documentationLabel: "Slack API Console",
      fields: [
        {
          key: "slack_webhook_url",
          label: "Incoming Webhook URL",
          placeholder: "https://hooks.slack.com/services/Txxx/Bxxx/xxxx",
          value: getVal("slack_webhook_url"),
          hasValue: hasVal("slack_webhook_url"),
          instructions: "From Slack App Directory → Incoming WebHooks.",
        },
        {
          key: "slack_bot_token",
          label: "Bot User OAuth Token",
          isSecret: true,
          placeholder: "xoxb-xxxx...",
          value: getVal("slack_bot_token"),
          hasValue: hasVal("slack_bot_token"),
          instructions: "Bot token for two-way interactive message actions.",
        },
      ],
    },

    // 13. QuickBooks Online
    {
      id: "quickbooks-accounting",
      category: "Accounting",
      name: "QuickBooks Online",
      description:
        "Automated accounting sync for Etsy & multi-channel sales, fees, refunds, and cost of goods sold.",
      icon: "📗",
      status: hasVal("quickbooks_client_id") ? "CONFIGURED" : "NOT_CONFIGURED",
      documentationUrl: "https://developer.intuit.com",
      documentationLabel: "Intuit Developer Portal",
      callbackUrls: [
        {
          label: "Production OAuth Callback",
          url: `${PROD_BASE}/api/integrations/quickbooks/callback`,
        },
      ],
      fields: [
        {
          key: "quickbooks_client_id",
          label: "QuickBooks Client ID",
          placeholder: "ABxxxx...",
          value: getVal("quickbooks_client_id"),
          hasValue: hasVal("quickbooks_client_id"),
          instructions: "From Intuit Developer Portal App Keys.",
        },
        {
          key: "quickbooks_client_secret",
          label: "QuickBooks Client Secret",
          isSecret: true,
          value: getVal("quickbooks_client_secret"),
          hasValue: hasVal("quickbooks_client_secret"),
          instructions: "Encrypted client secret for Intuit OAuth 2.0.",
        },
      ],
    },

    // 14. Xero
    {
      id: "xero-accounting",
      category: "Accounting",
      name: "Xero Cloud Accounting",
      description:
        "Sync invoices, bank feeds, and marketplace payout reconciliation with Xero.",
      icon: "📘",
      status: hasVal("xero_client_id") ? "CONFIGURED" : "NOT_CONFIGURED",
      documentationUrl: "https://developer.xero.com",
      documentationLabel: "Xero Developer Portal",
      fields: [
        {
          key: "xero_client_id",
          label: "Xero Client ID",
          placeholder: "xero_client_id_xxxx",
          value: getVal("xero_client_id"),
          hasValue: hasVal("xero_client_id"),
          instructions: "From Xero App Developer portal.",
        },
        {
          key: "xero_client_secret",
          label: "Xero Client Secret",
          isSecret: true,
          value: getVal("xero_client_secret"),
          hasValue: hasVal("xero_client_secret"),
          instructions: "Encrypted Xero client secret.",
        },
      ],
    },

    // 15. WordPress
    {
      id: "wordpress-cms",
      category: "CMS",
      name: "WordPress / WooCommerce Headless",
      description:
        "Publish marketing content, SEO guides, and product catalogs directly to WordPress via Application Passwords.",
      icon: "📰",
      status: hasVal("wordpress_site_url") && hasVal("wordpress_app_username") ? "CONFIGURED" : "NOT_CONFIGURED",
      documentationUrl: "https://make.wordpress.org/core/2020/11/05/application-passwords-integration-guide/",
      documentationLabel: "WordPress Application Passwords",
      fields: [
        {
          key: "wordpress_site_url",
          label: "WordPress Site URL",
          placeholder: "https://blog.example.com",
          value: getVal("wordpress_site_url"),
          hasValue: hasVal("wordpress_site_url"),
          instructions: "Base WordPress site URL with REST API enabled.",
        },
        {
          key: "wordpress_app_username",
          label: "Application Username",
          placeholder: "sellersalt_admin",
          value: getVal("wordpress_app_username"),
          hasValue: hasVal("wordpress_app_username"),
          instructions: "WordPress username with author or administrator privileges.",
        },
        {
          key: "wordpress_app_password",
          label: "Application Password",
          isSecret: true,
          placeholder: "xxxx xxxx xxxx xxxx",
          value: getVal("wordpress_app_password"),
          hasValue: hasVal("wordpress_app_password"),
          instructions: "Generated from WP Admin → Users → Profile → Application Passwords.",
        },
      ],
    },

    // 16. OpenAI
    {
      id: "openai-ai",
      category: "AI & Infrastructure",
      name: "OpenAI (GPT-4o & Text Generation)",
      description:
        "Powers listing copy generation, tag recommendation, and competitor synthesis with originality guards.",
      icon: "🤖",
      status: hasVal("openai_api_key") ? "CONFIGURED" : "NOT_CONFIGURED",
      documentationUrl: "https://platform.openai.com/api-keys",
      documentationLabel: "OpenAI Developer Platform",
      fields: [
        {
          key: "openai_api_key",
          label: "OpenAI Secret API Key",
          isSecret: true,
          placeholder: "sk-proj-xxxx...",
          value: getVal("openai_api_key"),
          hasValue: hasVal("openai_api_key"),
          instructions: "From OpenAI Platform → API Keys.",
        },
        {
          key: "openai_default_model",
          label: "Default Model",
          placeholder: "gpt-4o",
          value: getVal("openai_default_model"),
          hasValue: hasVal("openai_default_model"),
          instructions: "e.g. gpt-4o, gpt-4o-mini, o1-preview.",
        },
      ],
    },

    // 17. Anthropic Claude
    {
      id: "anthropic-ai",
      category: "AI & Infrastructure",
      name: "Anthropic Claude",
      description:
        "Claude 3.5 Sonnet engine for advanced contextual SEO copy and humanized product description generation.",
      icon: "🧠",
      status: hasVal("anthropic_api_key") ? "CONFIGURED" : "NOT_CONFIGURED",
      documentationUrl: "https://console.anthropic.com",
      documentationLabel: "Anthropic Console",
      fields: [
        {
          key: "anthropic_api_key",
          label: "Anthropic API Key",
          isSecret: true,
          placeholder: "sk-ant-xxxx...",
          value: getVal("anthropic_api_key"),
          hasValue: hasVal("anthropic_api_key"),
          instructions: "From Anthropic Console → API Keys.",
        },
        {
          key: "anthropic_default_model",
          label: "Default Model",
          placeholder: "claude-3-5-sonnet-20241022",
          value: getVal("anthropic_default_model"),
          hasValue: hasVal("anthropic_default_model"),
          instructions: "e.g. claude-3-5-sonnet-20241022, claude-3-haiku-20240307.",
        },
      ],
    },

    // 18. Google Gemini AI
    {
      id: "gemini-ai",
      category: "AI & Infrastructure",
      name: "Google Gemini AI",
      description:
        "High-speed multimodal intelligence for image analysis, listing audits, and market trend processing.",
      icon: "✨",
      status: hasVal("gemini_api_key") ? "CONFIGURED" : "NOT_CONFIGURED",
      documentationUrl: "https://aistudio.google.com",
      documentationLabel: "Google AI Studio",
      fields: [
        {
          key: "gemini_api_key",
          label: "Google Gemini API Key",
          isSecret: true,
          placeholder: "AIzaSy...",
          value: getVal("gemini_api_key"),
          hasValue: hasVal("gemini_api_key"),
          instructions: "From Google AI Studio → Get API Key.",
        },
        {
          key: "gemini_default_model",
          label: "Default Model",
          placeholder: "gemini-1.5-flash",
          value: getVal("gemini_default_model"),
          hasValue: hasVal("gemini_default_model"),
          instructions: "e.g. gemini-1.5-pro, gemini-1.5-flash.",
        },
      ],
    },

    // 19. Model Context Protocol (MCP)
    {
      id: "mcp-server",
      category: "AI & Infrastructure",
      name: "Model Context Protocol (MCP)",
      description:
        "Connect SellerSalt intelligence tools directly to Claude Desktop, Cursor, and MCP-compatible agents.",
      icon: "🔌",
      status: hasVal("mcp_server_url") ? "CONFIGURED" : "NOT_CONFIGURED",
      documentationUrl: "https://modelcontextprotocol.io",
      documentationLabel: "Model Context Protocol Docs",
      callbackUrls: [
        {
          label: "MCP Protocol Server Endpoint",
          description: "SSE / Stream Endpoint for AI Agents",
          url: `${PROD_BASE}/api/mcp/v1`,
        },
      ],
      fields: [
        {
          key: "mcp_server_url",
          label: "MCP Server URL",
          placeholder: `${PROD_BASE}/api/mcp/v1`,
          value: getVal("mcp_server_url"),
          hasValue: hasVal("mcp_server_url"),
          instructions: "Canonical MCP endpoint exposed by SellerSalt.",
        },
        {
          key: "mcp_auth_token",
          label: "MCP Protocol Bearer Auth Token",
          isSecret: true,
          placeholder: "mcp_sec_xxxx...",
          value: getVal("mcp_auth_token"),
          hasValue: hasVal("mcp_auth_token"),
          instructions: "Secret token required for external agents to invoke SellerSalt tools.",
        },
      ],
    },
  ];

  const categories = [
    { id: "ALL", label: "All Integrations", count: integrations.length },
    { id: "Marketplace", label: "Marketplaces", count: integrations.filter((i) => i.category === "Marketplace").length },
    { id: "Productivity", label: "Productivity & Automation", count: integrations.filter((i) => i.category === "Productivity").length },
    { id: "Accounting", label: "Accounting & Finance", count: integrations.filter((i) => i.category === "Accounting").length },
    { id: "CMS", label: "CMS & Publishing", count: integrations.filter((i) => i.category === "CMS").length },
    { id: "AI & Infrastructure", label: "AI & Developer Infra", count: integrations.filter((i) => i.category === "AI & Infrastructure").length },
  ];

  const filteredIntegrations = integrations.filter((item) => {
    if (selectedCategory !== "ALL" && item.category !== selectedCategory) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        item.name.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const configuredCount = integrations.filter((i) => i.status === "CONFIGURED" || i.status === "CONNECTED").length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap pb-4 border-b border-[var(--color-line)]">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-[var(--color-ink)]">Integration Hub</h2>
            <Badge variant="success">
              {configuredCount} / {integrations.length} Active
            </Badge>
          </div>
          <p className="text-sm text-[var(--color-ink-muted)] mt-1">
            Canonical command center for all marketplace connectors, productivity automations, accounting sync, and AI providers.
          </p>
        </div>
      </div>

      {/* Category Pills and Search */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors flex items-center gap-1.5 shrink-0 ${
                selectedCategory === cat.id
                  ? "bg-[var(--color-brand-primary)] text-white shadow-xs font-semibold"
                  : "bg-[var(--color-surface)] text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] border border-[var(--color-line)]"
              }`}
            >
              <span>{cat.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  selectedCategory === cat.id ? "bg-white/20 text-white" : "bg-[var(--color-paper)] text-[var(--color-ink-muted)]"
                }`}
              >
                {cat.count}
              </span>
            </button>
          ))}
        </div>

        <div className="relative min-w-[240px]">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-ink-muted)]" />
          <input
            type="text"
            placeholder="Search connectors & tools..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs pl-8 pr-3 py-1.5 rounded-xl bg-[var(--color-surface)] border border-[var(--color-line)] text-[var(--color-ink)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand-primary)]"
          />
        </div>
      </div>

      {/* Integration Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredIntegrations.map((item) => (
          <IntegrationCard
            key={item.id}
            {...item}
            onSave={handleBulkSave}
          />
        ))}
      </div>
    </div>
  );
}
