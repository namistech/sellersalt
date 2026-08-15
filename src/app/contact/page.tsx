import type { Metadata } from "next";
import { PublicHeader } from "@/components/public/PublicHeader";
import { PublicFooter } from "@/components/public/PublicFooter";
import { ContactClient } from "./contact-client";
import { getSetting } from "@/lib/app-settings";

const SITE_URL = process.env.NEXTAUTH_URL ?? "https://sellersalt.com";

export const metadata: Metadata = {
  title: "Contact & Support | SellerSalt",
  description:
    "Get in touch with the SellerSalt team for questions about Etsy competitor research, Opportunity Radar intelligence, or subscription plans.",
  alternates: { canonical: `${SITE_URL}/contact` },
};

export default async function ContactPage() {
  const supportEmail = (await getSetting("support_email")) || "support@sellersalt.com";

  return (
    <div className="min-h-screen flex flex-col bg-[#FAFAF8] text-[#141B16]">
      <PublicHeader currentPath="/contact" />

      <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-12">
        <ContactClient supportEmail={supportEmail} />
      </main>

      <PublicFooter />
    </div>
  );
}
