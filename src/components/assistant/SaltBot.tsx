"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import {
  Sparkles,
  X,
  Minus,
  Send,
  RefreshCw,
  ChevronUp,
  Bot,
  Maximize2,
  Minimize2,
  Trash2,
  ArrowRight,
} from "lucide-react";
import { Button, Input, Badge } from "@/components/ui";
import type { AssistantMessage } from "@/services/assistant/types";

// The ONE SaltBot UI — header trigger, floating bubble, chat window, and
// fullscreen mode all render through this single component. Previously
// there were two independent implementations (a Drawer-based one opened
// from the header, and this floating-bubble one) that could visually and
// behaviorally drift from each other — see this component's git history.
// AppShell mounts exactly one instance and controls it via open/onOpenChange
// so the header button and the floating bubble both operate the same window.

const SUGGESTED_QUERIES = [
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

export interface SaltBotProps {
  /** Omit for standalone/uncontrolled use (manages its own open state). */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function SaltBot({ open: controlledOpen, onOpenChange }: SaltBotProps = {}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = controlledOpen ?? internalOpen;
  function setIsOpen(next: boolean) {
    onOpenChange?.(next);
    if (controlledOpen === undefined) setInternalOpen(next);
  }

  const [isMinimized, setIsMinimized] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [assistantName, setAssistantName] = useState("SaltBot");
  const [inputQuery, setInputQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [messages, setMessages] = useState<AssistantMessage[]>([
    {
      id: "initial_1",
      sender: "assistant",
      intent: "HELP",
      text: "Hi! I am SaltBot, your Etsy Intelligence Copilot. Ask me anything about your niche research, competitor sales velocity, or select a priority research action below.",
      timestamp: new Date().toISOString(),
    },
  ]);

  useEffect(() => {
    fetch("/api/settings/public")
      .then((r) => r.json())
      .then((d) => {
        if (d.assistantName) setAssistantName(d.assistantName);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (isOpen && !isMinimized) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen, isMinimized, isFullscreen]);

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
    setShowSuggestions(false);
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
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: `err_${Date.now()}`,
            sender: "assistant",
            intent: "HELP",
            text: "I ran into a temporary hiccup analyzing that request. Please try again or rephrase.",
            timestamp: new Date().toISOString(),
          },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          sender: "assistant",
          intent: "HELP",
          text: "Network error connecting to SaltBot engine.",
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleClearChat() {
    setMessages([
      {
        id: `initial_${Date.now()}`,
        sender: "assistant",
        intent: "HELP",
        text: "Conversation cleared. What would you like to research next on Etsy?",
        timestamp: new Date().toISOString(),
      },
    ]);
    setShowSuggestions(true);
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
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 bg-white hover:bg-[#FAFAF8] text-[#141B16] rounded-full shadow-lg border border-[#E3E6E0] hover:border-[#0E8F5D] transition-all transform hover:scale-105 group"
          title={`Open ${assistantName} Copilot`}
        >
          <div className="relative">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#141B16] text-[#FFB020] shadow-sm">
              <Sparkles className="h-4 w-4 animate-pulse" />
            </span>
            <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#0E8F5D] opacity-80"></span>
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-[#0E8F5D] border-2 border-white"></span>
            </span>
          </div>
          <span className="text-xs font-bold tracking-tight text-[#141B16]">
            Ask {assistantName}
          </span>
        </button>
      )}

      {/* Floating or Fullscreen Chat Window — light theme throughout, including
          the header (previously a dark #141B16 bar, which this project's
          design rules explicitly disallow for SaltBot). */}
      {isOpen && (
        <div
          className={`fixed z-50 bg-white shadow-2xl transition-all overflow-hidden flex flex-col ${
            isFullscreen
              ? "inset-4 sm:inset-8 rounded-2xl border border-line"
              : isMinimized
              ? "bottom-6 right-6 w-80 h-14 rounded-2xl border border-line"
              : "bottom-6 right-6 w-[92vw] sm:w-[480px] h-[640px] max-h-[88vh] rounded-2xl border border-line"
          }`}
        >
          {/* Header */}
          <div className="px-4 py-3.5 bg-white border-b border-line text-ink flex items-center justify-between shrink-0 select-none">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-8 w-8 rounded-lg bg-[#0E8F5D]/10 border border-[#0E8F5D]/30 flex items-center justify-center text-[#0E8F5D]">
                <Sparkles className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-extrabold truncate flex items-center gap-1.5 text-ink">
                  <span>{assistantName}</span>
                  <span className="text-[10px] font-normal text-ink-tertiary">Etsy Copilot</span>
                </div>
                <div className="text-[10px] text-ink-tertiary flex items-center gap-1.5 mt-0.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#0E8F5D] inline-block" />
                  <span>Deterministic Engine + AI Fallback</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleClearChat}
                className="p-1.5 rounded text-ink-tertiary hover:text-ink hover:bg-surface-muted"
                title="Clear conversation"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>

              {!isMinimized && (
                <button
                  type="button"
                  onClick={() => setIsFullscreen(!isFullscreen)}
                  className="p-1.5 rounded text-ink-tertiary hover:text-ink hover:bg-surface-muted"
                  title={isFullscreen ? "Exit Fullscreen" : "Fullscreen Workspace"}
                >
                  {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  if (isFullscreen) setIsFullscreen(false);
                  setIsMinimized(!isMinimized);
                }}
                className="p-1.5 rounded text-ink-tertiary hover:text-ink hover:bg-surface-muted"
                title={isMinimized ? "Expand" : "Minimize"}
              >
                {isMinimized ? <ChevronUp className="h-4 w-4" /> : <Minus className="h-4 w-4" />}
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  setIsFullscreen(false);
                }}
                className="p-1.5 rounded text-ink-tertiary hover:text-ink hover:bg-surface-muted"
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
                        <div className="h-7 w-7 rounded-full bg-[#141B16] text-[#0E8F5D] flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                          <Bot className="h-4 w-4" />
                        </div>
                      )}

                      <div
                        className={`max-w-[85%] rounded-2xl px-4 py-2.5 space-y-2.5 leading-relaxed ${
                          isUser
                            ? "bg-[#141B16] text-white rounded-br-none shadow-2xs"
                            : "bg-white text-ink border border-line rounded-tl-none shadow-2xs"
                        }`}
                      >
                        <p className="whitespace-pre-wrap">{msg.text}</p>

                        {/* Result Cards if any */}
                        {msg.cards && msg.cards.length > 0 && (
                          <div className="space-y-2 pt-1">
                            {msg.cards.map((card) => (
                              <div
                                key={card.id}
                                className="p-3 rounded-xl border border-line bg-[#FAFAF8] text-ink space-y-1.5"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <span className="font-bold text-xs truncate">{card.title}</span>
                                  {card.badge && (
                                    <Badge
                                      variant={
                                        card.badge.variant === "success"
                                          ? "success"
                                          : card.badge.variant === "accent"
                                          ? "gold"
                                          : card.badge.variant === "warn"
                                          ? "warning"
                                          : "neutral"
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
                                  <div className="grid grid-cols-2 gap-1.5 pt-1 text-[10px] font-mono">
                                    {card.metrics.map((m, idx) => (
                                      <div key={idx} className="bg-white p-1.5 rounded border border-line">
                                        <span className="text-ink-tertiary">{m.label}: </span>
                                        <span className="font-bold text-ink">{m.value}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {card.href && (
                                  <div className="pt-1.5">
                                    <Link href={card.href} onClick={() => setIsOpen(false)}>
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

                        {/* Actions if any */}
                        {msg.actions && msg.actions.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {msg.actions.map((act, idx) =>
                              act.href ? (
                                <Link key={idx} href={act.href} onClick={() => setIsOpen(false)}>
                                  <Button size="compact" variant="primary" className="text-[11px]">
                                    {act.label}
                                  </Button>
                                </Link>
                              ) : act.actionKey ? (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={() => handleSendQuery(act.actionKey!)}
                                  className="rounded border border-[#0E8F5D] bg-white px-2.5 py-1 text-[11px] font-semibold text-[#0E8F5D] hover:bg-[#0E8F5D]/10 transition"
                                >
                                  {act.label}
                                </button>
                              ) : null
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* Vertical Prebuilt Queries (one per row, never a horizontal chip row) */}
                {showSuggestions && (
                  <div className="pt-2 space-y-2">
                    <div className="text-[11px] font-bold text-ink-tertiary uppercase tracking-wider px-1">
                      Priority Research Queries
                    </div>
                    <div className="space-y-1.5">
                      {SUGGESTED_QUERIES.map((query, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleSendQuery(query)}
                          disabled={loading}
                          className="w-full text-left px-3.5 py-2.5 rounded-xl bg-white hover:bg-[#E7FAF1] text-xs font-medium text-ink hover:text-[#0E8F5D] border border-line hover:border-[#0E8F5D]/40 transition-colors flex items-center justify-between group shadow-2xs"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <Sparkles className="h-3.5 w-3.5 text-[#FFB020] shrink-0" />
                            <span className="truncate">{query}</span>
                          </div>
                          <ArrowRight className="h-3 w-3 text-ink-tertiary group-hover:text-[#0E8F5D] shrink-0 ml-2" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {loading && (
                  <div className="flex items-center gap-2 text-ink-tertiary text-xs py-1.5 px-2">
                    <RefreshCw className="h-3.5 w-3.5 animate-spin text-[#0E8F5D]" />
                    <span>{assistantName} is querying real Etsy market signals...</span>
                  </div>
                )}

                <div ref={messagesEndRef} />
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
                  placeholder={`Ask ${assistantName} a question...`}
                  value={inputQuery}
                  onChange={(e) => setInputQuery(e.target.value)}
                  disabled={loading}
                  className="text-xs flex-1"
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
