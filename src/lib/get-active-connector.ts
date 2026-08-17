import { prisma } from "./db";
import { decrypt } from "./encryption";
import { getConnector } from "@/connectors/registry";
import { getSetting } from "./app-settings";

/** Resolves the connector an org should use: their own dedicated key if they
 * have one (opt-in, e.g. Agency-tier), otherwise the shared platform
 * connector (organizationId: null), or the AppSetting / environment variable
 * canonical credentials. */
export async function getActiveConnectorWithCredentials(organizationId: string, type: string = "ETSY") {
  const own = await prisma.connector.findFirst({
    where: { organizationId, type: type as any, status: "ACTIVE" },
  });
  const connectorRow =
    own ?? (await prisma.connector.findFirst({ where: { organizationId: null, type: type as any, status: "ACTIVE" } }));

  if (connectorRow) {
    try {
      const connector = getConnector(connectorRow.type);
      const credentials = JSON.parse(decrypt(connectorRow.encryptedCredentials));
      return { connectorRow, connector, credentials };
    } catch {
      // If decryption fails, fall through to AppSetting / env fallback
    }
  }

  // AppSetting fallback (admin site settings)
  const appSettingApiKey = await getSetting("etsy_seller_client_id");
  const appSettingSecret = await getSetting("etsy_seller_client_secret");
  if (appSettingApiKey) {
    const connector = getConnector(type);
    return {
      connectorRow: { id: "app-setting-etsy", type, name: "AppSetting Etsy", organizationId: null, status: "ACTIVE" },
      connector,
      credentials: { apiKey: appSettingApiKey, sharedSecret: appSettingSecret || "" },
    };
  }

  // Environment fallback
  const envApiKey =
    process.env.ETSY_SELLER_CLIENT_ID ||
    process.env.ETSY_CLIENT_ID ||
    process.env.ETSY_KEYSTRING ||
    process.env.ETSY_API_KEY ||
    "";
  const envSecret = process.env.ETSY_SELLER_CLIENT_SECRET || process.env.ETSY_SHARED_SECRET || "";

  if (envApiKey) {
    const connector = getConnector(type);
    return {
      connectorRow: { id: "env-etsy", type, name: "Environment Etsy", organizationId: null, status: "ACTIVE" },
      connector,
      credentials: { apiKey: envApiKey, sharedSecret: envSecret },
    };
  }

  return null;
}

