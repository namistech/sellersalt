"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, MessageSquare, Clock, Sparkles, CheckCircle2, ShieldCheck } from "lucide-react";
import { Card, Button, Input, Select, Textarea, Alert, Heading, Text } from "@/components/ui";

export function ContactClient() {
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
      setErrorMessage("Network error sending message. Please email support@sellersalt.com directly.");
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
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
                  { value: "General Product Question", label: "General Product Question" },
                  { value: "Opportunity Radar & Research Data", label: "Opportunity Radar & Research Data" },
                  { value: "Billing, Plans & Trials", label: "Billing, Plans & Trials" },
                  { value: "Bug Report or Technical Issue", label: "Bug Report or Technical Issue" },
                  { value: "Agency & Multi-Seat Workspaces", label: "Agency & Multi-Seat Workspaces" },
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
                  href="mailto:support@sellersalt.com"
                  className="text-xs font-semibold text-[#16C784] hover:underline"
                >
                  support@sellersalt.com
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
              Start researching verified Etsy sales velocity and high-converting product niches with a $1 trial.
            </p>
            <Link href="/checkout?plan=PRO" className="block pt-1">
              <Button variant="secondary" size="compact" fullWidth className="text-xs font-semibold">
                Start 3-Day Trial ($1) →
              </Button>
            </Link>
          </Card>
        </div>
      </div>
    </div>
  );
}
