"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, MessageSquare, Clock, Sparkles, CheckCircle2, ShieldCheck, ChevronDown } from "lucide-react";
import { Card, Button, Input, Select, Textarea, Alert, Heading, Text } from "@/components/ui";

interface FaqItem {
  q: string;
  a: string;
}

const FAQ_CATEGORIES: Array<{ category: string; contactSubject: string; items: FaqItem[] }> = [
  {
    category: "Account & 2FA Security",
    contactSubject: "Account & 2FA Security",
    items: [
      {
        q: "How do I enable two-factor authentication?",
        a: "Go to Settings → Profile → Security. Click \"Setup Authenticator App\", scan the QR code with an app like Google Authenticator or Authy (or enter the manual key), then enter the 6-digit code to confirm. Save your backup codes somewhere safe — each one works once if you lose your device.",
      },
      {
        q: "I lost my authenticator device and can't sign in.",
        a: "Use one of your backup codes on the login screen's verification step instead of a 6-digit code. If you didn't save your backup codes, contact support with the email on file — we'll need to verify your identity before disabling 2FA on your account.",
      },
      {
        q: "Can I sign in with a passkey instead of a password?",
        a: "Yes. Set one up in Settings → Profile → Security → Passkeys, then use \"Sign in with a passkey\" on the login page. Passkeys work with Touch ID, Face ID, Windows Hello, or a hardware security key.",
      },
    ],
  },
  {
    category: "Billing & Plans",
    contactSubject: "Billing & Plans",
    items: [
      {
        q: "How do I change my subscription plan?",
        a: "Go to Settings → Billing to see available plans and switch. Payment is handled by whichever providers your workspace has active — you'll see real \"Pay with Card\" / \"Pay with PayPal\" buttons only for providers actually configured.",
      },
      {
        q: "Where do I update my payment method?",
        a: "Payment methods are managed on the provider's own checkout/portal (Stripe or PayPal), opened when you subscribe or change plans — SellerSalt never stores your card details directly.",
      },
    ],
  },
  {
    category: "Etsy Store Connection & OAuth",
    contactSubject: "Etsy Store Connection & OAuth",
    items: [
      {
        q: "How do I connect my Etsy shop?",
        a: "Go to Settings → Connected Stores and click \"Connect Your Etsy Shop\". You'll be sent to Etsy to authorize access in a new tab, then land back here with your shop synced automatically.",
      },
      {
        q: "I got a redirect or authorization error connecting Etsy.",
        a: "This usually clears up on retry. If you consistently see \"Temporarily blocked\" or a redirect error, wait a few minutes before trying again, and contact support if it persists — this can indicate an app-level rate limit on Etsy's side.",
      },
    ],
  },
  {
    category: "Research (Shops, Products, Radar)",
    contactSubject: "Opportunity Research & Radar",
    items: [
      {
        q: "What's the difference between Prospects, Opportunity Radar, and Spy on Competitor?",
        a: "Prospects is keyword-driven product search across everything discovered. Opportunity Radar surfaces the highest-scoring finds automatically. Spy on Competitor takes a specific shop URL and pulls up its full Shop Intelligence profile — it works even for shops you haven't searched before.",
      },
      {
        q: "How is the Opportunity Score calculated?",
        a: "From real data only — lifetime sales, review count and velocity, catalog size, and shop age, weighted into a 0–100 score. We never fabricate sales or revenue figures; where a number is estimated (like gross profit), it's labeled as an estimate with the methodology shown.",
      },
    ],
  },
  {
    category: "Keyword Research & Planning",
    contactSubject: "Opportunity Research & Radar",
    items: [
      {
        q: "How do I research a keyword?",
        a: "Use Keyword Research in the sidebar. Results come from keywords already discovered in your own research data (real listings, not generated guesses), with filters for exact/starts-with/ends-with/contains matching and word count (1, 2, 3, or 4+ words for long-tail).",
      },
      {
        q: "What does \"Add to Keyword Planning\" do?",
        a: "It saves that keyword to your persistent Planning list (Favorites → Planned Keywords), where you can search, export, and remove it later. It's separate from your research history.",
      },
    ],
  },
  {
    category: "Shop Intelligence",
    contactSubject: "Opportunity Research & Radar",
    items: [
      {
        q: "How do I start tracking a shop's daily sales?",
        a: "Open the shop's profile page and click \"Start Tracking Sales of This Shop\" in the tracking section. SellerSalt captures a daily snapshot; a real trend chart appears once at least two snapshots have been recorded.",
      },
      {
        q: "Why don't I see a sales trend yet?",
        a: "Trend data is built entirely from real snapshots over time — there's no fabricated placeholder trend. If tracking just started, check back after 24–48 hours once a second snapshot has been captured.",
      },
    ],
  },
  {
    category: "Data Exports",
    contactSubject: "Data Exports (CSV / Google Sheets)",
    items: [
      {
        q: "How do I export my data?",
        a: "CSV export is available on Prospects, Favorites, and Keyword Research — select rows (or none, to export everything visible) and click Export. Every export reflects your currently applied filters.",
      },
      {
        q: "Is Google Sheets export available?",
        a: "Not yet connected end-to-end — this is on our roadmap. CSV export covers every research surface today and opens cleanly in Google Sheets via import.",
      },
    ],
  },
  {
    category: "SaltBot Assistant",
    contactSubject: "SaltBot AI Intelligence Assistant",
    items: [
      {
        q: "What can SaltBot help with?",
        a: "Your top opportunities, competitor velocity, saved research, tracked shops, and triggering your latest search — ask in plain language or use one of the suggested queries. It answers from your real workspace data first; for questions outside SellerSalt's scope, it says so rather than guessing.",
      },
      {
        q: "Where do I open SaltBot?",
        a: "The floating button in the bottom-right corner, or the assistant icon in the top bar — both open the same conversation.",
      },
    ],
  },
  {
    category: "Bug Reports & Feedback",
    contactSubject: "Technical Bug or Feedback",
    items: [
      {
        q: "I found a bug — what should I include in my report?",
        a: "The page you were on, what you expected vs. what happened, and a screenshot if possible. Use the form below with \"Technical Bug or Feedback\" as the topic.",
      },
    ],
  },
];

export function ContactClient({ supportEmail }: { supportEmail: string }) {
  const [openFaqCategory, setOpenFaqCategory] = useState<string | null>(FAQ_CATEGORIES[0]?.category ?? null);
  const [openFaqItem, setOpenFaqItem] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("General Product Question");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setLoading(true);

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, subject, message }),
      });

      const data = await res.json();
      setLoading(false);

      if (!res.ok) {
        setErrorMessage(data.error ?? "Failed to send message.");
        return;
      }

      setSuccessMessage(
        data.message ?? "Thank you! Your message has been sent successfully. We'll reply within 24 hours."
      );
      setName("");
      setEmail("");
      setMessage("");
    } catch {
      setErrorMessage(`Network error sending message. Please email ${supportEmail} directly.`);
      setLoading(false);
    }
  }

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto space-y-3">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E7FAF1] text-[#0E8F5D] text-xs font-semibold border border-[#16C784]/30">
          <MessageSquare className="h-3.5 w-3.5" />
          Support & Inquiries
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#141B16]">
          How Can We Help You?
        </h1>
        <p className="text-sm text-[#525B55]">
          Have questions about SellerSalt's Opportunity Radar, data accuracy, or subscription plans? Our team is here to assist.
        </p>
      </div>

      {/* Self-Help First */}
      <div className="max-w-3xl mx-auto space-y-4">
        <Heading as="h2" size="h4" className="text-[#141B16]">
          Browse answers first — most questions are covered here
        </Heading>
        <div className="space-y-2">
          {FAQ_CATEGORIES.map((cat) => (
            <Card key={cat.category} padding="sm" className="border-[#E3E6E0] bg-white shadow-xs">
              <button
                type="button"
                onClick={() => setOpenFaqCategory(openFaqCategory === cat.category ? null : cat.category)}
                className="w-full flex items-center justify-between px-2 py-1.5 text-left"
              >
                <span className="text-sm font-bold text-[#141B16]">{cat.category}</span>
                <ChevronDown className={`h-4 w-4 text-[#7C847E] transition-transform ${openFaqCategory === cat.category ? "rotate-180" : ""}`} />
              </button>

              {openFaqCategory === cat.category && (
                <div className="px-2 pb-1.5 pt-1 space-y-1.5">
                  {cat.items.map((item) => {
                    const itemId = `${cat.category}__${item.q}`;
                    const isOpen = openFaqItem === itemId;
                    return (
                      <div key={itemId} className="border-t border-[#EDEFEA] pt-1.5 first:border-t-0 first:pt-0">
                        <button
                          type="button"
                          onClick={() => setOpenFaqItem(isOpen ? null : itemId)}
                          className="w-full text-left text-xs font-semibold text-[#2A362D] hover:text-[#0E8F5D]"
                        >
                          {item.q}
                        </button>
                        {isOpen && <p className="text-xs text-[#525B55] mt-1 leading-relaxed">{item.a}</p>}
                      </div>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() => {
                      setSubject(cat.contactSubject);
                      document.getElementById("contact-form")?.scrollIntoView({ behavior: "smooth" });
                    }}
                    className="text-[11px] font-semibold text-[#0E8F5D] hover:underline pt-1"
                  >
                    Still need help with this? Contact support →
                  </button>
                </div>
              )}
            </Card>
          ))}
        </div>
      </div>

      <div id="contact-form" className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Contact Form Card */}
        <Card padding="lg" className="lg:col-span-2 border-[#E3E6E0] bg-white shadow-xs">
          {successMessage ? (
            <div className="py-8 text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-[#E7FAF1] text-[#16C784] flex items-center justify-center mx-auto">
                <CheckCircle2 className="h-7 w-7" />
              </div>
              <Heading as="h2" size="h3" className="text-[#141B16]">
                Message Delivered
              </Heading>
              <p className="text-sm text-[#525B55] max-w-md mx-auto">
                {successMessage}
              </p>
              <div className="pt-4">
                <Button
                  variant="secondary"
                  size="compact"
                  onClick={() => setSuccessMessage(null)}
                >
                  Send Another Note
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  id="name"
                  label="Your Full Name"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Jane Doe"
                />

                <Input
                  id="email"
                  label="Email Address"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                />
              </div>

              <Select
                label="Topic / Subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                options={[
                  { value: "Account & 2FA Security", label: "Account & 2FA Security" },
                  { value: "Billing & Plans", label: "Billing & Plans" },
                  { value: "Etsy Store Connection & OAuth", label: "Etsy Store Connection & OAuth" },
                  { value: "Opportunity Research & Radar", label: "Opportunity Research & Radar" },
                  { value: "Data Exports (CSV / Google Sheets)", label: "Data Exports (CSV / Google Sheets)" },
                  { value: "SaltBot AI Intelligence Assistant", label: "SaltBot AI Intelligence Assistant" },
                  { value: "Technical Bug or Feedback", label: "Technical Bug or Feedback" },
                ]}
              />

              <Textarea
                id="message"
                label="How can we help?"
                required
                rows={5}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Tell us what you need help with (at least 10 characters)..."
              />

              {errorMessage && <Alert variant="danger">{errorMessage}</Alert>}

              <div className="pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  loading={loading}
                  size="default"
                  className="bg-[#141B16] text-white hover:bg-[#2A362D] font-semibold px-6 shadow-xs"
                >
                  Send Message →
                </Button>
              </div>
            </form>
          )}
        </Card>

        {/* Sidebar Info Card */}
        <div className="space-y-5">
          <Card padding="md" className="border-[#E3E6E0] bg-white shadow-xs space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#E7FAF1] text-[#0E8F5D] flex items-center justify-center shrink-0">
                <Mail className="h-4 w-4" />
              </div>
              <div>
                <div className="font-bold text-sm text-[#141B16]">Direct Email</div>
                <a
                  href={`mailto:${supportEmail}`}
                  className="text-xs font-semibold text-[#16C784] hover:underline"
                >
                  {supportEmail}
                </a>
              </div>
            </div>

            <div className="flex items-start gap-3 border-t border-[#E3E6E0] pt-3">
              <div className="w-8 h-8 rounded-lg bg-[#F4F3EF] text-[#525B55] flex items-center justify-center shrink-0">
                <Clock className="h-4 w-4" />
              </div>
              <div>
                <div className="font-bold text-sm text-[#141B16]">Response Time</div>
                <div className="text-xs text-[#7C847E]">Usually within 24 hours on business days</div>
              </div>
            </div>

            <div className="flex items-start gap-3 border-t border-[#E3E6E0] pt-3">
              <div className="w-8 h-8 rounded-lg bg-[#F4F3EF] text-[#525B55] flex items-center justify-center shrink-0">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <div>
                <div className="font-bold text-sm text-[#141B16]">Security & Privacy</div>
                <div className="text-xs text-[#7C847E]">Messages handled in strict accordance with our Privacy Policy.</div>
              </div>
            </div>
          </Card>

          <Card padding="md" className="border-[#E3E6E0] bg-[#FAFAF8] shadow-xs space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#141B16]">
              <Sparkles className="h-3.5 w-3.5 text-[#FFB020]" />
              Ready to explore opportunities?
            </div>
            <p className="text-xs text-[#525B55] leading-relaxed">
              Start researching verified Etsy sales velocity and high-converting product niches.
            </p>
            <Link href="/checkout?plan=PRO" className="block pt-1">
              <Button variant="secondary" size="compact" fullWidth className="text-xs font-semibold">
                Get Started →
              </Button>
            </Link>
          </Card>
        </div>
      </div>
    </div>
  );
}
