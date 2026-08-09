import { prisma } from "./db";
import { decrypt } from "./encryption";
import { getConnector } from "@/connectors/registry";

/** Resolves the connector an org should use: their own dedicated key if they
 * have one (opt-in, e.g. Agency-tier), otherwise the shared platform
 * connector (organizationId: null) that every customer uses by default.
 * Regular users never need to "connect" anything — this fallback is the
 * whole point. */
export async function getActiveConnectorWithCredentials(organizationId: string, type: string = "ETSY") {
  const own = await prisma.connector.findFirst({
    where: { organizationId, type: type as any, status: "ACTIVE" },
  });
  const connectorRow =
    own ?? (await prisma.connector.findFirst({ where: { organizationId: null, type: type as any, status: "ACTIVE" } }));

  if (!connectorRow) return null;

  const connector = getConnector(connectorRow.type);
  const credentials = JSON.parse(decrypt(connectorRow.encryptedCredentials));
  return { connectorRow, connector, credentials };
}
