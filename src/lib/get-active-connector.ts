import { prisma } from "./db";
import { decrypt } from "./encryption";
import { getConnector } from "@/connectors/registry";

/** Any active connector works for shop-level lookups (stats, tracking, resolve-by-URL) —
 * these aren't tied to a specific search, just "a working connection to the platform." */
export async function getActiveConnectorWithCredentials(organizationId: string) {
  const connectorRow = await prisma.connector.findFirst({
    where: { organizationId, status: "ACTIVE" },
  });
  if (!connectorRow) return null;

  const connector = getConnector(connectorRow.type);
  const credentials = JSON.parse(decrypt(connectorRow.encryptedCredentials));
  return { connectorRow, connector, credentials };
}
