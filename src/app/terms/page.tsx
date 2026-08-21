import type { Metadata } from "next";
import Link from "next/link";
import { PublicHeader } from "@/components/public/PublicHeader";
import { PublicFooter } from "@/components/public/PublicFooter";
import { ShieldCheck, AlertCircle } from "lucide-react";

const SITE_URL = process.env.NEXTAUTH_URL ?? "https://sellersalt.com";

export const metadata: Metadata = {
  title: "Terms of Service | SellerSalt",
  description:
    "Review the terms, conditions, and subscription policies governing your use of SellerSalt's ecommerce intelligence platform.",
  alternates: { canonical: `${SITE_URL}/terms` },
};

export default function TermsPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#FAFAF8] text-[#141B16]">
      <PublicHeader currentPath="/terms" />

      <main className="flex-1 max-w-4xl mx-auto w-full px-6 py-12">
        <div className="space-y-8">
          {/* Header */}
          <div className="border-b border-[#E3E6E0] pb-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-800 text-xs font-bold mb-3">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Legal Agreement</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#141B16]">
              Terms of Service
            </h1>
            <p className="mt-2 text-sm text-[#7C847E]">
              Last updated: [DATE]
            </p>
            <div className="mt-4 p-3.5 rounded-xl border border-amber-200 bg-amber-50/50 text-amber-900 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p>
                <strong>Notice:</strong> Starting draft, not final. Have a qualified attorney review before publishing — particularly liability, dispute-resolution, and data-processing sections.
              </p>
            </div>
          </div>

          {/* Legal Content Body */}
          <div className="space-y-8 text-sm leading-relaxed text-[#525B55]">
            <section className="space-y-3">
              <h2 className="text-lg font-bold text-[#141B16]">1. Acceptance of Terms</h2>
              <p>
                By creating an account or using SellerSalt (&quot;the Service,&quot; &quot;we,&quot; &quot;us,&quot; operated by Netdrix Cloud Services, a company registered in the United Arab Emirates, operating as Netdrix Digital), you agree to these Terms and our Privacy Policy. If using SellerSalt on behalf of an Organization (Agency, Institute, or Company), you represent you have authority to bind that organization.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-bold text-[#141B16]">2. Description of Service</h2>
              <p>
                SellerSalt helps merchants research products and keywords, optimize and manage listings across connected online stores, and access analytics for their own connected shops. SellerSalt connects to third-party platforms only through each platform&apos;s official, authorized integration method, and only accesses data belonging to the shop the authenticated user has explicitly connected.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-bold text-[#141B16]">3. Accounts</h2>
              <p>
                You must provide accurate registration information and keep it current. You&apos;re responsible for your account&apos;s confidentiality and activity. Accounts may be individual or created under an Organization (Agency, Institute, Company) with multiple Users assigned roles by the Organization&apos;s administrator.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-bold text-[#141B16]">4. Connected Store Data</h2>
              <p>
                Connecting a marketplace or store authorizes SellerSalt to access that store&apos;s data through the platform&apos;s official API, solely to provide the Service to you. SellerSalt does not use your connection to view, collect, or analyze any other seller&apos;s shop data. You may disconnect at any time.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-bold text-[#141B16]">5. Subscriptions, Billing, and Seats</h2>
              <p>
                [NEEDS FOUNDER INPUT: plan tiers, billing cycle, seat-based pricing, renewal terms.] Payments processed by Stripe/PayPal; SellerSalt does not store full payment card details. [NEEDS FOUNDER INPUT: refund/cancellation policy and data handling on downgrade.]
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-bold text-[#141B16]">6. Acceptable Use</h2>
              <p>
                You agree not to: violate any third-party platform&apos;s terms of service, including marketplaces SellerSalt connects to; reverse-engineer, scrape, or circumvent any part of the Service or connected platforms; collect data about individuals/businesses beyond your own legitimate ecommerce operations; exceed your subscription&apos;s seat limits. [Add Influencer/UGC marketplace clauses once that feature ships — prohibit undisclosed sponsored content, require FTC-compliant disclosure.]
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-bold text-[#141B16]">7. Third-Party Integrations</h2>
              <p>
                SellerSalt may integrate with Zapier, Slack, QuickBooks, and MCP-connected AI agents at your direction. Your use of those is governed by their own terms; SellerSalt is not responsible for third-party service availability or behavior.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-bold text-[#141B16]">8. Intellectual Property</h2>
              <p>
                SellerSalt and its content/features are owned by Netdrix Cloud Services. You retain ownership of your own content (listing text, product data) input into or created through SellerSalt. Marketplace names are trademarks of their respective owners — see our <Link href="/trademarks" className="text-emerald-700 font-semibold hover:underline">Trademark Disclosures page</Link>.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-bold text-[#141B16]">9. Disclaimers</h2>
              <p>
                SellerSalt provides research, estimates, and recommendations to support your decisions — it does not guarantee sales, rankings, or business outcomes. Estimated values are always clearly labeled as estimates, not confirmed fact. [NEEDS LEGAL REVIEW: standard &quot;AS IS&quot; warranty disclaimer scoped to applicable jurisdiction(s).]
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-bold text-[#141B16]">10. Limitation of Liability</h2>
              <p>
                [NEEDS LEGAL REVIEW: limitation of liability clause — enforceability varies significantly by jurisdiction and consumer-protection law given the UAE/UK corporate structure and international customer base.]
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-bold text-[#141B16]">11. Termination</h2>
              <p>
                You may cancel at any time. We may suspend or terminate accounts that violate these Terms, including use that violates a connected marketplace&apos;s own terms of service.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-bold text-[#141B16]">12. Changes to These Terms</h2>
              <p>
                We may update these Terms; material changes will be notified via email or in-app notice before taking effect.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-bold text-[#141B16]">13. Governing Law and Dispute Resolution</h2>
              <p>
                [NEEDS LEGAL REVIEW: governing law and dispute resolution — UAE primary entity (Netdrix Cloud Services) with UK affiliate (ErgoForge Global Limited) and an international customer base.]
              </p>
            </section>

            <section className="space-y-3 border-t border-[#E3E6E0] pt-6">
              <h2 className="text-lg font-bold text-[#141B16]">14. Contact</h2>
              <p>
                support@sellersalt.com, Monday–Friday 9:00 AM – 6:00 PM, or via the in-dashboard ticket system.
              </p>
              <div className="mt-4 rounded-xl bg-white p-4 border border-[#E3E6E0] text-xs space-y-1.5">
                <div><strong>Email:</strong> <a href="mailto:support@sellersalt.com" className="text-emerald-700 hover:underline">support@sellersalt.com</a></div>
                <div><strong>Support Contact:</strong> <Link href="/contact" className="text-emerald-700 hover:underline">sellersalt.com/contact</Link></div>
                <div><strong>Operator:</strong> Netdrix Cloud Services (UAE), operating as Netdrix Digital</div>
                <div><strong>UK Affiliate:</strong> ErgoForge Global Limited</div>
                <div><strong>Support Hours:</strong> Monday &ndash; Friday 9:00 AM &ndash; 6:00 PM + in-dashboard tickets</div>
              </div>
            </section>
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
