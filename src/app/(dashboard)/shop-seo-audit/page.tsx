import { redirect } from "next/navigation";

export default function ShopSeoAuditRedirectPage({
  searchParams,
}: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  redirect("/seo?tab=SHOP_SEO");
}
