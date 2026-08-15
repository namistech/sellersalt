import type { Metadata } from "next";
import Link from "next/link";
import { PublicHeader } from "@/components/public/PublicHeader";
import { PublicFooter } from "@/components/public/PublicFooter";

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
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#141B16]">
              Terms of Service
            </h1>
            <p className="mt-2 text-sm text-[#7C847E]">
              Last updated: August 15, 2026 · Effective immediately upon account registration
            </p>
          </div>

          {/* Legal Content Body */}
          <div className="space-y-8 text-sm leading-relaxed text-[#525B55]">
            <section className="space-y-3">
              <h2 className="text-lg font-bold text-[#141B16]">1. Acceptance of Terms</h2>
              <p>
                By creating an account, initiating a trial, or accessing the SellerSalt platform ("SellerSalt", "we", "us", or "our"), you agree to be bound by these Terms of Service. If you are entering into these terms on behalf of a company, agency, or other legal entity, you represent that you have the authority to bind such entity.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-bold text-[#141B16]">2. Description of the Service</h2>
              <p>
                SellerSalt provides ecommerce market research, sales velocity tracking, competitor monitoring, and Opportunity Radar intelligence tools designed for online sellers and brand owners. We aggregate and analyze publicly available marketplace data to assist users with business decision-making.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-bold text-[#141B16]">3. Subscriptions, Trials, and Billing</h2>
              <p>
                <strong>Trial Access:</strong> New users may be eligible for a 3-day trial for $1.00 USD. Unless cancelled before the expiration of the trial period, the subscription will automatically transition to the selected paid plan (e.g., Started at $19/mo, Pro at $49/mo, or Agency at $199/mo).
              </p>
              <p>
                <strong>Recurring Billing:</strong> Subscriptions are billed in advance on a recurring monthly cycle. You authorize SellerSalt to charge your payment provider (Stripe, PayPal, or other active gateway) for applicable fees.
              </p>
              <p>
                <strong>Cancellation:</strong> You may cancel your subscription at any time directly through the Billing settings inside your account dashboard. Cancellation takes effect at the end of the current billing cycle.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-bold text-[#141B16]">4. Third-Party Marketplace Disclaimer</h2>
              <p>
                SellerSalt is an independent ecommerce analytics tool. SellerSalt is <strong>not affiliated, associated, authorized, endorsed by, or in any way officially connected with Etsy, Inc.</strong> ("Etsy"), Shopify Inc., or any of their subsidiaries or affiliates. The name "Etsy" as well as related names, marks, emblems, and images are registered trademarks of their respective owners.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-bold text-[#141B16]">5. User Accounts & Workspace Security</h2>
              <p>
                You are responsible for maintaining the confidentiality of your account credentials, including your login email and password. You agree to notify us immediately of any unauthorized use of your account. You may invite team members to your organization according to the seat quotas permitted by your active plan tier.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-bold text-[#141B16]">6. Acceptable Use Policy</h2>
              <p>
                You agree not to misuse SellerSalt services. Specifically, you agree not to: (a) reverse-engineer, decompile, or attempt to extract source code from the platform; (b) probe, scan, or test the vulnerability of any system or network; (c) use automated bots to overwhelm our application endpoints beyond reasonable human usage; or (d) resell or sublicense access to third parties outside of authorized agency accounts.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-bold text-[#141B16]">7. Disclaimers & Limitation of Liability</h2>
              <p>
                SellerSalt provides market intelligence and opportunity scores "as is" and "as available". While we strive for maximum accuracy using verified lifetime transaction snapshots, sales estimates and opportunity classifications are provided solely for analytical and exploratory purposes. We make no warranties regarding commercial success, profit margins, or specific sales outcomes.
              </p>
              <p>
                In no event shall SellerSalt, its directors, employees, or partners be liable for any indirect, incidental, special, consequential, or punitive damages arising out of your access to or use of the platform.
              </p>
            </section>

            <section className="space-y-3 border-t border-[#E3E6E0] pt-6">
              <h2 className="text-lg font-bold text-[#141B16]">8. Contact Information</h2>
              <p>
                If you have questions concerning these Terms of Service, please contact our support team at:
              </p>
              <div className="rounded-lg bg-white p-4 border border-[#E3E6E0] text-xs space-y-1">
                <div><strong>Email:</strong> support@sellersalt.com</div>
                <div><strong>Support Surface:</strong> <Link href="/contact" className="text-[#16C784] hover:underline">sellersalt.com/contact</Link></div>
                <div><strong>Legal Entity:</strong> SellerSalt Technologies <em>[Legal Entity Name & Registered Jurisdiction Placeholder]</em></div>
              </div>
            </section>
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
