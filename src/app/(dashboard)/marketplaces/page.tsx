import { getServerSession } from "next-auth";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/shell";
import { Card, Badge, Text, Heading } from "@/components/ui";
import { MarketplaceRegistry, registerAllConnectors } from "@/marketplaces/core/registry";

// Reads live from the marketplace connector registry (src/marketplaces/core)
// rather than a hardcoded list — a marketplace only shows a real capability
// badge once its connector actually implements it. Etsy is IMPLEMENTED,
// Shopify/WooCommerce are PARTIAL (orders only), Amazon/eBay/TikTok Shop are
// ARCHITECTURE READY (registered, zero live capabilities) — see
// /docs/MARKETPLACE-INTEGRATION-MATRIX.md for the authoritative status table.
export default async function MarketplacesOverviewPage() {
  registerAllConnectors();
  const session = await getServerSession(authOptions);
  const organizationId = (session?.user as any)?.organizationId as string | undefined;

  const connectedChannels = organizationId
    ? await prisma.sellerChannel.findMany({
        where: { organizationId },
        select: { id: true, platform: true, label: true, status: true },
      })
    : [];

  const connectors = MarketplaceRegistry.list();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Marketplaces"
        description="SellerSalt is a marketplace-agnostic intelligence platform — Etsy, Shopify, WooCommerce, Amazon, eBay, and TikTok Shop are all connectors into the same research and optimization engine."
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {connectors.map((connector) => {
          const capabilityCount = Object.values(connector.capabilities).filter(Boolean).length;
          const status =
            capabilityCount === 0
              ? { label: "Architecture Ready", variant: "neutral" as const }
              : connector.capabilities.createListing || connector.capabilities.research
              ? { label: "Implemented", variant: "success" as const }
              : { label: "Partial", variant: "warning" as const };

          const connections = connectedChannels.filter((c) =>
            c.platform.toLowerCase().startsWith(connector.marketplace === "etsy" ? "etsy" : connector.marketplace)
          );

          return (
            <Card key={connector.marketplace} padding="lg" className="space-y-3">
              <div className="flex items-center justify-between">
                <Heading as="h3" size="h4">
                  {connector.displayName}
                </Heading>
                <Badge variant={status.variant}>{status.label}</Badge>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {connector.capabilities.research && <Badge variant="neutral">Research</Badge>}
                {connector.capabilities.accountAuth && <Badge variant="neutral">Account Connect</Badge>}
                {connector.capabilities.readOrders && <Badge variant="neutral">Orders</Badge>}
                {connector.capabilities.createListing && <Badge variant="neutral">Listing Create</Badge>}
                {capabilityCount === 0 && (
                  <Text size="body-sm" color="secondary">
                    No live API integration yet.
                  </Text>
                )}
              </div>

              {connections.length > 0 ? (
                <Text size="body-sm" color="secondary">
                  {connections.length} connected account{connections.length === 1 ? "" : "s"}
                </Text>
              ) : (
                <Text size="body-sm" color="secondary">
                  Not connected
                </Text>
              )}
            </Card>
          );
        })}
      </div>

      <Card padding="lg">
        <Text size="body-sm" color="secondary">
          Manage OAuth connections under{" "}
          <Link href="/settings/channels" className="text-accent font-semibold hover:underline">
            Settings → Connected Accounts
          </Link>
          .
        </Text>
      </Card>
    </div>
  );
}
