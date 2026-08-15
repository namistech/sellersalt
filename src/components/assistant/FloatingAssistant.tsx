"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import {
  Sparkles,
  X,
  Minus,
  Send,
  ExternalLink,
  RefreshCw,
  ChevronUp,
  Bot,
} from "lucide-react";
import { Button, Input, Badge } from "@/components/ui";
import type { AssistantMessage } from "@/services/assistant/types";

const SUGGESTED_CHIPS = [
  "What are my best opportunities today?",
  "What changed since yesterday?",
  "Show me emerging winners.",
  "Find low competition opportunities.",
  "Which competitors are growing fastest?",
  "What should I research today?",
  "Show my saved opportunities.",
  "Show my tracked competitors.",
  "Run my latest search.",
  "What should I do next?",
];

export function FloatingAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [inputQuery, setInputQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [messages, setMessages] = useState<AssistantMessage[]>([
    {
      id: "initial_1",
      sender: "assistant",
      intent: "HELP",
      text: "Hi! I am your Etsy Research Assistant. I can scan your market opportunities, audit competitor sales velocity, and prioritize today's research agenda.",
      timestamp: new Date().toISOString(),
    },
  ]);

  useEffect(() => {
    if (isOpen && !isMinimized) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen, isMinimized]);

  async function handleSendQuery(queryToSend?: string) {
    const text = (queryToSend || inputQuery).trim();
    if (!text || loading) return;

    const userMsg: AssistantMessage = {
      id: `usr_${Date.now()}`,
      sender: "user",
      intent: "HELP",
      text,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuery("");
    setLoading(true);

    try {
      const history = messages.map((m) => ({
        role: m.sender === "user" ? ("user" as const) : ("assistant" as const),
        content: m.text,
      }));

      const res = await fetch("/api/assistant/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: text, history }),
      });

      const data = await res.json();
      if (data.message) {
        setMessages((prev) => [...prev, data.message]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          sender: "assistant",
          intent: "HELP",
          text: "Could not reach the research assistant service. Please verify your connection.",
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* Floating Launcher Button */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => {
            setIsOpen(true);
            setIsMinimized(false);
          }}
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 bg-[#141B16] hover:bg-[#0E8F5D] text-white rounded-full shadow-lg border border-[#0E8F5D]/30 transition-all transform hover:scale-105 group"
          title="Open Etsy Research Copilot"
        >
          <div className="relative">
            <Sparkles className="h-5 w-5 text-[#FFB020] animate-pulse" />
            <span className="absolute -top-1 -right-1 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#0E8F5D] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#0E8F5D]"></span>
            </span>
          </div>
          <span className="text-xs font-bold tracking-tight">Ask Assistant</span>
        </button>
      )}

      {/* Floating Support-Chat Window */}
      {isOpen && (
        <div
          className={`fixed bottom-6 right-6 z-50 bg-white rounded-2xl border border-line shadow-2xl transition-all overflow-hidden flex flex-col ${
            isMinimized
              ? "w-72 h-14"
              : "w-[92vw] sm:w-[420px] h-[580px] max-h-[85vh]"
          }`}
        >
          {/* Header */}
          <div className="px-4 py-3 bg-[#141B16] text-white flex items-center justify-between shrink-0 select-none">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="h-7 w-7 rounded-lg bg-[#0E8F5D]/20 border border-[#0E8F5D]/40 flex items-center justify-center text-[#FFB020]">
                <Sparkles className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold truncate">Etsy Intelligence Copilot</div>
                <div className="text-[10px] text-[#AEB4AC] flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#0E8F5D]" /> Local Engine + AI Fallback
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setIsMinimized(!isMinimized)}
                className="p-1 rounded text-white/70 hover:text-white hover:bg-white/10"
                title={isMinimized ? "Expand" : "Minimize"}
              >
                {isMinimized ? <ChevronUp className="h-4 w-4" /> : <Minus className="h-4 w-4" />}
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1 rounded text-white/70 hover:text-white hover:bg-white/10"
                title="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Body */}
          {!isMinimized && (
            <>
              {/* Messages Area */}
              <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-[#FAFAF8] text-xs">
                {messages.map((msg) => {
                  const isUser = msg.sender === "user";
                  return (
                    <div
                      key={msg.id}
                      className={`flex gap-2.5 ${isUser ? "justify-end" : "justify-start"}`}
                    >
                      {!isUser && (
                        <div className="h-6 w-6 rounded-full bg-[#141B16] text-[#0E8F5D] flex items-center justify-center shrink-0 mt-0.5">
                          <Bot className="h-3.5 w-3.5" />
                        </div>
                      )}

                      <div
                        className={`max-w-[85%] rounded-xl p-3 shadow-2xs ${
                          isUser
                            ? "bg-[#141B16] text-white"
                            : "bg-white border border-line text-ink"
                        }`}
                      >
                        <div className="leading-relaxed whitespace-pre-wrap text-xs">
                          {msg.text}
                        </div>

                        {/* Cards Render */}
                        {!isUser && msg.cards && msg.cards.length > 0 && (
                          <div className="mt-3 space-y-2">
                            {msg.cards.map((card) => (
                              <div
                                key={card.id}
                                className="p-2.5 rounded-lg bg-[#FAFAF8] border border-line-subtle space-y-1.5"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <div className="font-bold text-xs text-ink truncate">
                                    {card.title}
                                  </div>
                                  {card.badge && (
                                    <Badge
                                      variant={
                                        card.badge.variant === "warn"
                                          ? "warning"
                                          : card.badge.variant === "accent"
                                          ? "gold"
                                          : card.badge.variant
                                      }
                                    >
                                      {card.badge.label}
                                    </Badge>
                                  )}
                                </div>

                                {card.subtitle && (
                                  <div className="text-[11px] text-ink-secondary">
                                    {card.subtitle}
                                  </div>
                                )}

                                {card.metrics && (
                                  <div className="grid grid-cols-2 gap-1 pt-1 text-[10px] font-mono">
                                    {card.metrics.map((m, idx) => (
                                      <div key={idx} className="bg-white p-1 rounded border border-line">
                                        <span className="text-ink-tertiary">{m.label}: </span>
                                        <span className="font-bold text-ink">{m.value}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {card.href && (
                                  <div className="pt-1.5">
                                    <Link href={card.href}>
                                      <Button
                                        variant="secondary"
                                        size="compact"
                                        fullWidth
                                        className="text-[11px] h-7 bg-white hover:bg-[#F4F3EF]"
                                      >
                                        View Details →
                                      </Button>
                                    </Link>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {loading && (
                  <div className="flex items-center gap-2 text-ink-tertiary text-xs py-1">
                    <RefreshCw className="h-3.5 w-3.5 animate-spin text-[#0E8F5D]" />
                    <span>Analyzing research data...</span>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Quick Suggestion Chips */}
              <div className="p-2 bg-white border-t border-line overflow-x-auto whitespace-nowrap scrollbar-none flex gap-1.5">
                {SUGGESTED_CHIPS.map((chip, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleSendQuery(chip)}
                    disabled={loading}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#F4F3EF] hover:bg-[#E7FAF1] text-[11px] font-medium text-ink hover:text-[#0E8F5D] border border-line transition-colors shrink-0"
                  >
                    <Sparkles className="h-2.5 w-2.5 text-[#FFB020]" />
                    {chip}
                  </button>
                ))}
              </div>

              {/* Chat Input Bar */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendQuery();
                }}
                className="p-3 bg-white border-t border-line flex items-center gap-2"
              >
                <Input
                  value={inputQuery}
                  onChange={(e) => setInputQuery(e.target.value)}
                  placeholder="Ask about opportunities, competitors, or daily agenda..."
                  className="text-xs"
                  disabled={loading}
                />
                <Button
                  type="submit"
                  variant="primary"
                  size="compact"
                  disabled={!inputQuery.trim() || loading}
                  className="bg-[#0E8F5D] hover:bg-[#0C7A52] shrink-0"
                >
                  <Send className="h-3.5 w-3.5" />
                </Button>
              </form>
            </>
          )}
        </div>
      )}
    </>
  );
}
