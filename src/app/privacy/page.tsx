import type { Metadata } from "next";
import Link from "next/link";
import { PublicHeader } from "@/components/public/PublicHeader";
import { PublicFooter } from "@/components/public/PublicFooter";

const SITE_URL = process.env.NEXTAUTH_URL ?? "https://sellersalt.com";

export const metadata: Metadata = {
  title: "Privacy Policy | SellerSalt",
  description:
    "Learn how SellerSalt collects, uses, and safeguards your account data and privacy across our ecommerce intelligence services.",
  alternates: { canonical: `${SITE_URL}/privacy` },
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#FAFAF8] text-[#141B16]">
      <PublicHeader currentPath="/privacy" />

      <main className="flex-1 max-w-4xl mx-auto w-full px-6 py-12">
        <div className="space-y-8">
          {/* Header */}
          <div className="border-b border-[#E3E6E0] pb-6">
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#141B16]">
              Privacy Policy
            </h1>
            <p className="mt-2 text-sm text-[#7C847E]">
              Last updated: August 15, 2026 · Committed to transparency and data protection
            </p>
          </div>

          {/* Policy Body */}
          <div className="space-y-8 text-sm leading-relaxed text-[#525B55]">
            <section className="space-y-3">
              <h2 className="text-lg font-bold text-[#141B16]">1. Overview & Commitment</h2>
              <p>
                SellerSalt ("we", "us", or "our") respects your privacy. This Privacy Policy explains what information we collect when you use our website, application, and research tools, how we use and protect that information, and your choices regarding your data.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-bold text-[#141B16]">2. Information We Collect</h2>
              <p>
                We collect information necessary to provide and secure our ecommerce intelligence tools:
              </p>
              <ul className="list-disc pl-5 space-y-1.5">
                <li>
                  <strong>Account Information:</strong> When you register, we collect your name, email address, and an encrypted hash of your password. We never store plain-text passwords.
                </li>
                <li>
                  <strong>Billing Information:</strong> Payment transactions are handled directly by certified, PCI-compliant payment processors (such as Stripe and PayPal). SellerSalt stores only customer and subscription identifiers necessary to verify active plan entitlements.
                </li>
                <li>
                  <strong>Research & Search Configurations:</strong> Keywords, search filters, and competitor shop IDs that you choose to track within your workspace are stored to deliver automated daily snapshots and Opportunity Radar alerts.
                </li>
                <li>
                  <strong>Technical & Log Data:</strong> We automatically log standard connection details (such as IP address, browser type, and authentication cookies) to maintain session integrity and prevent brute-force attacks.
                </li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-bold text-[#141B16]">3. How We Use Information</h2>
              <p>We use the collected information exclusively to:</p>
              <ul className="list-disc pl-5 space-y-1.5">
                <li>Provide, operate, and maintain your SellerSalt workspace.</li>
                <li>Execute scheduled marketplace research streams on your behalf.</li>
                <li>Process subscription billing, renewals, and quota allocations.</li>
                <li>Send transactional system communications (such as password reset links, email change confirmations, and workspace invitations).</li>
                <li>Protect against unauthorized access, fraudulent activity, and abuse.</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-bold text-[#141B16]">4. Information Sharing & Disclosure</h2>
              <p>
                <strong>We do not sell, rent, or monetize your personal information.</strong> We share data only with third-party service providers essential for platform operations:
              </p>
              <ul className="list-disc pl-5 space-y-1.5">
                <li><strong>Payment Processors:</strong> Stripe and PayPal to process secure credit card and subscription charges.</li>
                <li><strong>Transactional Email Infrastructure:</strong> Secure SMTP services to transmit account and security notifications.</li>
                <li><strong>Cloud Infrastructure:</strong> Secure cloud database and hosting providers operating in modern data centers.</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-bold text-[#141B16]">5. Data Security & Encryption</h2>
              <p>
                We implement robust technical and organizational security measures:
              </p>
              <ul className="list-disc pl-5 space-y-1.5">
                <li>Password hashing using bcrypt with high salt rounds.</li>
                <li>AES-256-GCM authenticated encryption for sensitive credentials stored in the database.</li>
                <li>HTTPS / TLS 1.3 encryption across all public and authenticated endpoints.</li>
                <li>Strict multi-tenant database queries ensuring workspace isolation.</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-bold text-[#141B16]">6. Your Rights & Data Controls</h2>
              <p>
                You retain full control over your personal data. You have the right to:
              </p>
              <ul className="list-disc pl-5 space-y-1.5">
                <li>Access and review your account details at any time in Profile Settings.</li>
                <li>Update your login email address (protected by password verification).</li>
                <li>Export your discovered prospect and opportunity data via CSV export.</li>
                <li>Request complete deletion of your account and workspace data by contacting support.</li>
              </ul>
            </section>

            <section className="space-y-3 border-t border-[#E3E6E0] pt-6">
              <h2 className="text-lg font-bold text-[#141B16]">7. Contact & Privacy Inquiries</h2>
              <p>
                For privacy-related inquiries, data requests, or questions regarding our privacy practices:
              </p>
              <div className="rounded-lg bg-white p-4 border border-[#E3E6E0] text-xs space-y-1">
                <div><strong>Privacy Email:</strong> privacy@sellersalt.com</div>
                <div><strong>Support Contact:</strong> <Link href="/contact" className="text-[#16C784] hover:underline">sellersalt.com/contact</Link></div>
                <div><strong>Data Controller:</strong> SellerSalt Technologies <em>[Legal Entity Name & Registered Jurisdiction Placeholder]</em></div>
              </div>
            </section>
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
