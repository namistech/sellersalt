"use client";

import React, { useEffect, useState } from "react";
import {
  LifeBuoy,
  MessageSquare,
  Plus,
  Send,
  CheckCircle2,
  Clock,
  HelpCircle,
  ShieldCheck,
  AlertCircle,
  User,
  Headphones,
  FileQuestion,
} from "lucide-react";
import {
  Card,
  Badge,
  Button,
  Heading,
  Text,
  Dialog,
  Input,
  Textarea,
  Select,
  Alert,
  HowItWorksGuide,
} from "@/components/ui";
import { PageHeader } from "@/components/shell";
import type {
  SupportTicketItem,
  TicketCategory,
  TicketPriority,
} from "@/services/support-tickets";

const FAQS = [
  {
    question: "How frequently does the Competitor Surveillance engine refresh?",
    answer:
      "SellerSalt background workers capture competitor shop snapshots every 6 hours. When you click 'Spy on This Competitor', the first snapshot is captured immediately.",
  },
  {
    question: "Do I need to connect my own Etsy shop to research competitors?",
    answer:
      "No! SellerSalt platform connectors allow cold marketplace research, shop dossiers, and keyword auditing without ever needing to connect your own seller store.",
  },
  {
    question: "How are Opportunity Scores calculated?",
    answer:
      "Scores follow a transparent 100-point rubric analyzing verified sales velocity, catalog density, competition review moats, and net profit margins.",
  },
  {
    question: "How do I upgrade or manage my subscription plan?",
    answer:
      "You can upgrade your plan or add connector slots at any time from your Billing & Subscription settings page.",
  },
];

export default function SupportPage() {
  const [tickets, setTickets] = useState<SupportTicketItem[]>([]);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // New Ticket Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [category, setCategory] = useState<TicketCategory>("GENERAL");
  const [priority, setPriority] = useState<TicketPriority>("NORMAL");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  // Reply State
  const [replyText, setReplyText] = useState("");
  const [isSendingReply, setIsSendingReply] = useState(false);

  async function loadTickets() {
    try {
      const res = await fetch("/api/support/tickets");
      const data = await res.json();
      if (data.success) {
        setTickets(data.tickets);
        if (!selectedTicketId && data.tickets.length > 0) {
          setSelectedTicketId(data.tickets[0].id);
        }
      }
    } catch (err) {
      console.error("Failed to load tickets:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTickets();
  }, []);

  const selectedTicket = tickets.find((t) => t.id === selectedTicketId) || tickets[0] || null;

  async function handleCreateTicket(e: React.FormEvent) {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) {
      setModalError("Please complete all required fields.");
      return;
    }

    setIsSubmitting(true);
    setModalError(null);
    try {
      const res = await fetch("/api/support/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, message, category, priority }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create support ticket.");

      setSubmitSuccess("Ticket created successfully! Our team will respond shortly.");
      setSubject("");
      setMessage("");
      await loadTickets();
      setSelectedTicketId(data.ticket.id);
      setTimeout(() => {
        setIsModalOpen(false);
        setSubmitSuccess(null);
      }, 1500);
    } catch (err: any) {
      setModalError(err.message || "Failed to create ticket.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSendReply(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedTicket || !replyText.trim()) return;

    setIsSendingReply(true);
    try {
      const res = await fetch(`/api/support/tickets/${selectedTicket.id}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: replyText.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send reply.");

      setReplyText("");
      await loadTickets();
    } catch (err: any) {
      alert("Failed to send message: " + err.message);
    } finally {
      setIsSendingReply(false);
    }
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case "OPEN":
        return <Badge variant="warning" className="text-[10px] font-bold">Open</Badge>;
      case "IN_PROGRESS":
        return <Badge variant="info" className="text-[10px] font-bold">In Progress</Badge>;
      case "RESOLVED":
        return <Badge variant="success" className="text-[10px] font-bold">Resolved</Badge>;
      case "CLOSED":
        return <Badge variant="neutral" className="text-[10px] font-bold">Closed</Badge>;
      default:
        return <Badge variant="neutral" className="text-[10px] font-bold">{status}</Badge>;
    }
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* Contextual Guide */}
      <HowItWorksGuide
        title="How SellerSalt Support Works"
        description="Our technical support engineers respond to all inquiries within 4 business hours to assist with Etsy API syncing, surveillance, and billing."
        steps={[
          {
            title: "1. Open a Support Ticket",
            description: "Provide details about your question, marketplace query, or issue.",
            badge: "Direct Queue",
          },
          {
            title: "2. Fast Engineer Response",
            description: "Our dedicated technical team reviews tickets and provides verified resolutions.",
            badge: "< 4h Response",
          },
          {
            title: "3. Direct Conversation Thread",
            description: "Reply directly within the conversation thread until your question is fully resolved.",
            badge: "Live Thread",
          },
        ]}
      />

      <PageHeader
        title="Customer Support &amp; Help Desk"
        description="Get fast assistance with your account, competitor surveillance, and marketplace integrations."
        primaryAction={
          <Button
            variant="primary"
            size="compact"
            onClick={() => setIsModalOpen(true)}
            className="bg-[#0E8F5D] hover:bg-[#0C7A52] text-white text-xs font-bold"
          >
            <Plus className="h-4 w-4 mr-1.5 inline" /> Open Support Ticket
          </Button>
        }
      />

      {/* Support Layout: Left Column = Tickets List, Right Column = Active Conversation */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Tickets */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-ink uppercase tracking-wide">
              Your Support Tickets ({tickets.length})
            </h3>
            <span className="text-[11px] text-ink-tertiary">Direct support queue</span>
          </div>

          <div className="space-y-3">
            {tickets.length === 0 ? (
              <Card padding="lg" className="border-line bg-white text-center py-8 space-y-2">
                <LifeBuoy className="h-8 w-8 text-[#0E8F5D] mx-auto opacity-60" />
                <div className="font-bold text-xs text-ink">No support tickets opened</div>
                <p className="text-xs text-ink-secondary max-w-xs mx-auto">
                  Have a question about SellerSalt? Open a ticket and our team will help.
                </p>
                <Button
                  variant="secondary"
                  size="compact"
                  onClick={() => setIsModalOpen(true)}
                  className="text-xs"
                >
                  Open First Ticket
                </Button>
              </Card>
            ) : (
              tickets.map((t) => {
                const isSelected = t.id === selectedTicketId;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setSelectedTicketId(t.id)}
                    className={`w-full text-left p-4 rounded-xl border transition flex flex-col gap-2 ${
                      isSelected
                        ? "bg-white border-[#0E8F5D] shadow-sm ring-1 ring-[#0E8F5D]/20"
                        : "bg-surface hover:bg-white border-line"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-bold text-xs text-ink line-clamp-1">
                        {t.subject}
                      </span>
                      {getStatusBadge(t.status)}
                    </div>
                    <p className="text-xs text-ink-secondary line-clamp-2 leading-relaxed">
                      {t.message}
                    </p>
                    <div className="pt-1 flex items-center justify-between text-[10px] text-ink-tertiary">
                      <span className="px-1.5 py-0.5 rounded bg-surface-muted border border-line-subtle font-semibold">
                        {t.category.replace("_", " ")}
                      </span>
                      <span>{new Date(t.updatedAt).toLocaleDateString()}</span>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Quick FAQ Card */}
          <Card padding="md" className="border-line bg-white shadow-xs space-y-3 pt-4">
            <div className="flex items-center gap-2 pb-2 border-b border-line-subtle">
              <FileQuestion className="h-4 w-4 text-[#0E8F5D]" />
              <h4 className="text-xs font-bold text-ink uppercase tracking-wide">
                Frequently Asked Questions
              </h4>
            </div>

            <div className="space-y-3">
              {FAQS.map((faq, idx) => (
                <div key={idx} className="space-y-1 text-xs">
                  <div className="font-bold text-ink flex items-start gap-1.5">
                    <span className="text-[#0E8F5D] font-bold">Q:</span> {faq.question}
                  </div>
                  <p className="text-ink-secondary pl-4 leading-relaxed text-[11px]">
                    {faq.answer}
                  </p>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Right Column: Active Ticket Conversation */}
        <div className="lg:col-span-7">
          {selectedTicket ? (
            <Card padding="lg" className="border-line bg-white shadow-xs space-y-5">
              {/* Conversation Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-line-subtle">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-ink">{selectedTicket.subject}</h2>
                    {getStatusBadge(selectedTicket.status)}
                  </div>
                  <div className="text-xs text-ink-tertiary flex items-center gap-2">
                    <span>Category: <strong>{selectedTicket.category.replace("_", " ")}</strong></span>
                    <span>·</span>
                    <span>Created {new Date(selectedTicket.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>

              {/* Messages Flow */}
              <div className="space-y-4 max-h-[480px] overflow-y-auto pr-1">
                {/* Original Inquiry Message */}
                <div className="p-4 rounded-xl bg-[#FAFAF8] border border-line-subtle space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 font-bold text-ink">
                      <User className="h-3.5 w-3.5 text-ink-tertiary" />
                      <span>{selectedTicket.authorName}</span>
                      <span className="text-[10px] font-normal text-ink-tertiary">(Author)</span>
                    </div>
                    <span className="text-[10px] text-ink-tertiary">
                      {new Date(selectedTicket.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <p className="text-xs text-ink leading-relaxed whitespace-pre-wrap">
                    {selectedTicket.message}
                  </p>
                </div>

                {/* Replies */}
                {selectedTicket.replies.map((reply) => (
                  <div
                    key={reply.id}
                    className={`p-4 rounded-xl border space-y-2 text-xs ${
                      reply.isStaff
                        ? "bg-[#E7FAF1] border-[#16C784]/30 ml-4"
                        : "bg-[#FAFAF8] border-line-subtle"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 font-bold">
                        {reply.isStaff ? (
                          <>
                            <Headphones className="h-3.5 w-3.5 text-[#0E8F5D]" />
                            <span className="text-[#0E8F5D]">{reply.authorName}</span>
                            <Badge variant="success" className="text-[9px] px-1 py-0 font-bold">
                              STAFF
                            </Badge>
                          </>
                        ) : (
                          <>
                            <User className="h-3.5 w-3.5 text-ink-tertiary" />
                            <span className="text-ink">{reply.authorName}</span>
                          </>
                        )}
                      </div>
                      <span className="text-[10px] text-ink-tertiary">
                        {new Date(reply.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <p className="text-ink leading-relaxed whitespace-pre-wrap">{reply.message}</p>
                  </div>
                ))}
              </div>

              {/* Reply Input Box */}
              <form onSubmit={handleSendReply} className="space-y-3 pt-3 border-t border-line">
                <Textarea
                  placeholder="Type your reply to our support team..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  rows={3}
                  required
                  className="text-xs"
                />

                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-ink-tertiary flex items-center gap-1">
                    <ShieldCheck className="h-3.5 w-3.5 text-[#0E8F5D]" /> Encrypted support communication
                  </span>
                  <Button
                    type="submit"
                    variant="primary"
                    size="compact"
                    loading={isSendingReply}
                    className="bg-[#0E8F5D] hover:bg-[#0C7A52] text-white text-xs font-bold"
                  >
                    <Send className="h-3.5 w-3.5 mr-1.5 inline" /> Send Reply
                  </Button>
                </div>
              </form>
            </Card>
          ) : (
            <Card padding="lg" className="border-line bg-white text-center py-16 text-xs text-ink-tertiary">
              Select a support ticket to view the conversation.
            </Card>
          )}
        </div>
      </div>

      {/* New Support Ticket Modal */}
      <Dialog
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Open a Support Ticket"
        description="Describe your question or issue and our engineering team will assist you."
      >
        <form onSubmit={handleCreateTicket} className="space-y-4 pt-2">
          {modalError && <Alert variant="danger">{modalError}</Alert>}
          {submitSuccess && <Alert variant="success">{submitSuccess}</Alert>}

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-ink">Subject</label>
            <Input
              placeholder="e.g. Question about Etsy shop surveillance refresh"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              required
              className="text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-ink">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full text-xs py-2 px-3 rounded-lg border border-line bg-surface font-semibold text-ink"
              >
                <option value="GENERAL">General Inquiries</option>
                <option value="SURVEILLANCE">Competitor Surveillance</option>
                <option value="ETSY_API">Etsy API &amp; Connectors</option>
                <option value="BILLING">Billing &amp; Subscription</option>
                <option value="BUG_REPORT">Bug Report</option>
                <option value="FEATURE_QUESTION">Feature Guidance</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-ink">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                className="w-full text-xs py-2 px-3 rounded-lg border border-line bg-surface font-semibold text-ink"
              >
                <option value="LOW">Low</option>
                <option value="NORMAL">Normal</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-ink">Message &amp; Details</label>
            <Textarea
              placeholder="Please provide any details, shop URLs, or steps to reproduce..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              required
              className="text-xs"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-line">
            <Button
              type="button"
              variant="secondary"
              size="compact"
              onClick={() => setIsModalOpen(false)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="compact"
              loading={isSubmitting}
              className="text-xs bg-[#0E8F5D] hover:bg-[#0C7A52] text-white font-bold"
            >
              Submit Ticket
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
