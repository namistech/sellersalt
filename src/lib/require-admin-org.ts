import { getServerSession } from "next-auth";
import { authOptions } from "./auth";
import { isAdminEmail } from "./is-admin";

/** Used to gate seller-channel routes (Shopify/WooCommerce/cross-listing),
 * which are admin-only for now — MVP stays Etsy-focused for customers.
 * Returns the admin's organizationId, or null if not an admin/not logged in. */
export async function requireAdminOrg(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  if (!isAdminEmail(session?.user?.email)) return null;
  return (session?.user as any)?.organizationId ?? null;
}
