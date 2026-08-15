"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import {
  Sparkles,
  Send,
  X,
  Store,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  AlertCircle,
  HelpCircle,
} from "lucide-react";
import { Drawer, Button, Input, Badge, Text, Heading } from "@/components/ui";
import type { AssistantMessage } from "@/services/assistant/types";

const SUGGESTED_CHIPS = [
  "Show me my best opportunities",
  "What changed today?",
  "Find low competition niches",
  "Which competitors are growing fastest?",
  "What should I research today?",
  "Show my saved opportunities",
  "Run my latest search",
];

export interface AssistantDrawerProps {
  open: boolean;
  onClose: () => void;
}

export function AssistantDrawer({ open, onClose }: AssistantDrawerProps) {
  const [messages, setMessages] = useState<AssistantMessage[]>([
    {
      id: "welcome",
      sender: "assistant",
      text: "Hello! I am your SellerSalt Etsy Assistant. Ask me to identify top opportunities, compare competitor velocity, or summarize today's market changes.",
      timestamp: new Date().toISOString(),
      isDeterministic: true,
    },
  ]);
  const [inputQuery, setInputQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, open]);

  async function handleSendQuery(queryToSend: string) {
    if (!queryToSend.trim() || loading) return;

    const userMsg: AssistantMessage = {
      id: `user-${Date.now()}`,
      sender: "user",
      text: queryToSend,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuery("");
    setLoading(true);

    try {
      const res = await fetch("/api/assistant/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: queryToSend }),
      });

      const data = await res.json();
      if (data?.message) {
        setMessages((prev) => [...prev, data.message]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            sender: "assistant",
            text: "Sorry, I couldn't process that query right now.",
            timestamp: new Date().toISOString(),
            isDeterministic: true,
          },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          sender: "assistant",
          text: "Network error communicating with the assistant.",
          timestamp: new Date().toISOString(),
          isDeterministic: true,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleChipClick(chip: string) {
    handleSendQuery(chip);
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Etsy Personal Assistant"
      description="Deterministic Intelligence Copilot"
      size="lg"
    >
      <div className="flex h-[calc(100vh-140px)] flex-col justify-between">
        {/* Chat Messages Container */}
        <div className="flex-1 space-y-4 overflow-y-auto pr-1 pb-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${
                msg.sender === "user" ? "items-end" : "items-start"
              }`}
            >
              <div
                className={`max-w-[90%] rounded-lg p-3.5 text-sm ${
                  msg.sender === "user"
                    ? "bg-[#0E8F5D] text-white font-medium"
                    : "bg-surface-muted text-ink border border-line"
                }`}
              >
                <div className="whitespace-pre-wrap">{msg.text}</div>

                {/* Render Cards if present */}
                {msg.cards && msg.cards.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {msg.cards.map((card) => (
                      <div
                        key={card.id}
                        className="rounded-md border border-line bg-surface p-3 shadow-xs hover:border-line-strong transition"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <h4 className="text-xs font-semibold text-ink line-clamp-1">
                              {card.title}
                            </h4>
                            {card.subtitle && (
                              <p className="text-[11px] text-ink-tertiary truncate">
                                {card.subtitle}
                              </p>
                            )}
                          </div>
                          {card.badge && (
                            <Badge
                              variant={
                                card.badge.variant === "accent"
                                  ? "gold"
                                  : card.badge.variant === "success"
                                  ? "success"
                                  : card.badge.variant === "warn"
                                  ? "warning"
                                  : "neutral"
                              }
                            >
                              {card.badge.label}
                            </Badge>
                          )}
                        </div>

                        {card.metrics && (
                          <div className="mt-2 grid grid-cols-3 gap-1 rounded bg-surface-muted p-1.5 text-center text-[10px]">
                            {card.metrics.map((m, idx) => (
                              <div key={idx} className="min-w-0">
                                <span className="block text-ink-tertiary truncate">{m.label}</span>
                                <span className="font-semibold text-ink truncate">{m.value}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {card.href && (
                          <div className="mt-2 text-right">
                            {card.href.startsWith("http") ? (
                              <a
                                href={card.href}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#0E8F5D] hover:underline"
                              >
                                View Listing <ExternalLink className="h-3 w-3" />
                              </a>
                            ) : (
                              <Link
                                href={card.href}
                                onClick={onClose}
                                className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#0E8F5D] hover:underline"
                              >
                                Open in App <ChevronRight className="h-3 w-3" />
                              </Link>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Render Actions if present */}
                {msg.actions && msg.actions.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {msg.actions.map((act, idx) => {
                      if (act.href) {
                        return (
                          <Link key={idx} href={act.href} onClick={onClose}>
                            <Button size="compact" variant="primary" className="text-xs">
                              {act.label}
                            </Button>
                          </Link>
                        );
                      }
                      if (act.actionKey) {
                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => handleSendQuery(act.actionKey!)}
                            className="rounded border border-[#0E8F5D] bg-surface px-2.5 py-1 text-xs font-semibold text-[#0E8F5D] hover:bg-[#0E8F5D]/10 transition"
                          >
                            {act.label}
                          </button>
                        );
                      }
                      return null;
                    })}
                  </div>
                )}
              </div>
              <span className="mt-1 text-[10px] text-ink-tertiary px-1">
                {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
          ))}

          {loading && (
            <div className="flex items-center gap-2 text-xs text-ink-tertiary p-2">
              <Sparkles className="h-3.5 w-3.5 animate-spin text-[#0E8F5D]" />
              <span>Analyzing market data...</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Suggestion Chips */}
        <div className="border-t border-line pt-2">
          <p className="text-[11px] font-medium text-ink-tertiary mb-1.5 flex items-center gap-1">
            <Sparkles className="h-3 w-3 text-[#FFB020]" /> Suggested Questions:
          </p>
          <div className="flex flex-wrap gap-1 mb-3">
            {SUGGESTED_CHIPS.map((chip, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleChipClick(chip)}
                disabled={loading}
                className="rounded-full border border-line bg-surface px-2.5 py-1 text-[11px] text-ink-secondary hover:border-line-strong hover:text-ink transition disabled:opacity-50"
              >
                {chip}
              </button>
            ))}
          </div>

          {/* Input Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendQuery(inputQuery);
            }}
            className="flex gap-2"
          >
            <Input
              id="assistantInput"
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              placeholder="Ask anything about your Etsy market research..."
              className="text-xs"
              autoComplete="off"
            />
            <Button
              type="submit"
              variant="primary"
              disabled={!inputQuery.trim() || loading}
              className="shrink-0 bg-[#0E8F5D] hover:bg-[#0C7A52]"
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </div>
    </Drawer>
  );
}
