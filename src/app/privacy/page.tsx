import type { Metadata } from "next";
import Link from "next/link";
import { PublicHeader } from "@/components/public/PublicHeader";
import { PublicFooter } from "@/components/public/PublicFooter";
import { ShieldCheck, AlertCircle } from "lucide-react";

import { buildBreadcrumbListSchema } from "@/lib/seo-structured-data";

const SITE_URL = process.env.NEXTAUTH_URL ?? "https://sellersalt.com";

export const metadata: Metadata = {
  title: "Privacy Policy | SellerSalt",
  description:
    "Learn how SellerSalt collects, uses, and safeguards your account data and privacy across our ecommerce intelligence services.",
  alternates: { canonical: `${SITE_URL}/privacy` },
  openGraph: {
    type: "website",
    url: `${SITE_URL}/privacy`,
    siteName: "SellerSalt",
    title: "Privacy Policy | SellerSalt",
    description:
      "Learn how SellerSalt collects, uses, and safeguards your account data and privacy across our ecommerce intelligence services.",
    images: [
      {
        url: `${SITE_URL}/brand/og-image.png`,
        width: 1200,
        height: 630,
        alt: "SellerSalt Privacy Policy",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Privacy Policy | SellerSalt",
    description: "Data protection and privacy policies for SellerSalt.",
    images: [`${SITE_URL}/brand/og-image.png`],
  },
};

export default function PrivacyPage() {
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      buildBreadcrumbListSchema(
        [
          { name: "Home", url: "/" },
          { name: "Privacy Policy", url: "/privacy" },
        ],
        SITE_URL
      ),
    ],
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FAFAF8] text-[#141B16]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <PublicHeader currentPath="/privacy" />

      <main className="flex-1 max-w-4xl mx-auto w-full px-6 py-12">
        <div className="space-y-8">
          {/* Header */}
          <div className="border-b border-[#E3E6E0] pb-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-800 text-xs font-bold mb-3">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Data Protection & Privacy</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#141B16]">
              Privacy Policy
            </h1>
            <p className="mt-2 text-sm text-[#7C847E]">
              Last updated: August 22, 2026
            </p>
            <div className="mt-4 p-3.5 rounded-xl border border-amber-200 bg-amber-50/50 text-amber-900 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p>
                <strong>Notice:</strong> Starting draft, not final. Have a qualified attorney review before publishing, particularly international data transfer, regional privacy-rights, and retention sections.
              </p>
            </div>
          </div>

          {/* Policy Body */}
          <div className="space-y-8 text-sm leading-relaxed text-[#525B55]">
            <section className="space-y-3">
              <h2 className="text-lg font-bold text-[#141B16]">1. What This Policy Covers</h2>
              <p>
                Explains what information SellerSalt (&quot;we,&quot; &quot;us,&quot; operated by Netdrix Cloud Services, United Arab Emirates, operating as Netdrix Digital, UK affiliate ErgoForge Global Limited) collects, how we use it, and your choices.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-bold text-[#141B16]">2. Information We Collect</h2>
              <p>
                <strong>Account information</strong>: name, email, organization name, role, billing details (processed by payment providers — see Section 5).
              </p>
              <p>
                <strong>Connected store data</strong>: data belonging to the connected store only, through the platform&apos;s official API, limited to what&apos;s needed for the features you use.
              </p>
              <p>
                <strong>Extension telemetry</strong>: The SellerSalt browser extension operates strictly on an opt-in basis, requiring deliberate user installation and account pairing. The extension does not passively monitor general web browsing history or inject unauthorized content scripts. When active, it allows users to analyze listing opportunities, perform shop market research, and scan search results by sending user-specified queries and collecting publicly visible listing and shop data (such as titles, prices, ratings, and review counts) on connected marketplaces to power aggregate market research. Telemetry is disableable at any time in extension settings or account preferences. Individual browsing activity and raw queries are never shared with other users or third parties; only anonymized, aggregate market signals are utilized to enhance platform intelligence.
              </p>
              <p>
                <strong>Usage data</strong>: interactions with SellerSalt for product improvement and support.
              </p>
              <p>
                <strong>AI agent/MCP interactions</strong>: actions taken through any connected AI agent, logged for security and audit.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-bold text-[#141B16]">3. How We Use Information</h2>
              <p>
                To provide and improve the Service; to communicate about account/billing/product updates; to build aggregate, non-attributable market research datasets (individual users&apos; browsing is never shown to other customers); to detect and prevent fraud, abuse, and security incidents.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-bold text-[#141B16]">4. What We Don&apos;t Do</h2>
              <p>
                We do not use your connected store&apos;s access to view or analyze any other seller&apos;s shop data. We do not sell your personal information to third parties. We do not present modeled or estimated data as if it were confirmed fact.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-bold text-[#141B16]">5. Third-Party Service Providers</h2>
              <p>
                Payment processing: Stripe, PayPal (we do not store your full card number).
              </p>
              <p>
                Infrastructure/hosting: Contabo GmbH (data centers in Germany), managed via Coolify.
              </p>
              <p>
                Email delivery: Amazon SES (Amazon Simple Email Service).
              </p>
              <p>
                Integrations you connect: Zapier, Slack, QuickBooks, any MCP-connected AI agent — data flows only when you explicitly set up the connection.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-bold text-[#141B16]">6. Data Retention</h2>
              <p>
                We retain personal and operational data according to the following schedules:
              </p>
              <ul className="list-disc pl-5 space-y-1.5">
                <li>
                  <strong>Account and Connected Store Data</strong>: Maintained during active subscription status and for 90 days following account closure or cancellation, after which it is permanently deleted or anonymized.
                </li>
                <li>
                  <strong>Extension Telemetry &amp; Research Logs</strong>: Raw event logs and individual telemetry entries are discarded within 30 days; non-identifiable aggregated research signals are retained for market trends.
                </li>
                <li>
                  <strong>Financial and Billing Records</strong>: Retained for 5 years in compliance with United Arab Emirates tax and corporate statutory requirements.
                </li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-bold text-[#141B16]">7. Your Rights</h2>
              <p>
                We offer access, correction, structured export (data portability), and deletion rights to all users regardless of location upon request to <a href="mailto:support@sellersalt.com" className="text-emerald-700 underline">support@sellersalt.com</a>. Where applicable, statutory rights under the EU GDPR, UK GDPR, and California Consumer Privacy Act as amended by the California Privacy Rights Act (CCPA/CPRA) are specifically honored. Contact <a href="mailto:support@sellersalt.com" className="text-emerald-700 underline">support@sellersalt.com</a> to exercise applicable rights.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-bold text-[#141B16]">8. International Data Transfers</h2>
              <p>
                SellerSalt data is processed and stored on servers located in Germany (hosted by Contabo GmbH) and accessed by our operational teams in the United Arab Emirates and the United Kingdom. For cross-border data transfers from the European Economic Area (EEA) or the UK, we implement Standard Contractual Clauses (SCCs) or equivalent recognized transfer safeguards to ensure adequate data protection.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-bold text-[#141B16]">9. Children&apos;s Privacy</h2>
              <p>
                SellerSalt is not directed to, and we do not knowingly collect information from, anyone under 18.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-bold text-[#141B16]">10. Security</h2>
              <p>
                Industry-standard security measures, including encryption of connected-store access tokens at rest. No system is completely secure; use a strong, unique password.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-bold text-[#141B16]">11. Changes to This Policy</h2>
              <p>
                Material changes notified via email or in-app notice before taking effect.
              </p>
            </section>

            <section className="space-y-3 border-t border-[#E3E6E0] pt-6">
              <h2 className="text-lg font-bold text-[#141B16]">12. Contact</h2>
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
