"use client";

import React, { useState } from "react";
import {
  Shield,
  ShieldCheck,
  AlertTriangle,
  Lock,
  Zap,
  Activity,
  FileText,
  Clock,
  UserCheck,
  CheckCircle2,
  RefreshCw,
  Search,
  Filter,
} from "lucide-react";
import {
  Card,
  Heading,
  Text,
  Badge,
  Button,
  Alert,
} from "@/components/ui";

interface AuditLogEntry {
  id: string;
  event: string;
  actorEmail: string | null;
  targetEmail: string | null;
  createdAt: string;
  metadata?: Record<string, any> | null;
}

interface SecurityAbuseViewProps {
  auditLogs: AuditLogEntry[];
  onRefreshAuditLogs: () => void;
  disposableDomainsVal: string;
  allowedFreeDomainsVal: string;
  maxFreePerBusinessVal: string;
  onSaveSetting: (key: string, value: string) => Promise<boolean>;
}

export function SecurityAbuseView({
  auditLogs,
  onRefreshAuditLogs,
  disposableDomainsVal,
  allowedFreeDomainsVal,
  maxFreePerBusinessVal,
  onSaveSetting,
}: SecurityAbuseViewProps) {
  const [disposableDraft, setDisposableDraft] = useState(disposableDomainsVal);
  const [allowedFreeDraft, setAllowedFreeDraft] = useState(allowedFreeDomainsVal);
  const [maxFreeDraft, setMaxFreeDraft] = useState(maxFreePerBusinessVal);
  const [savingField, setSavingField] = useState<string | null>(null);
  const [successField, setSuccessField] = useState<string | null>(null);
  const [logFilter, setLogFilter] = useState("");

  const handleSave = async (key: string, val: string) => {
    setSavingField(key);
    const ok = await onSaveSetting(key, val);
    setSavingField(null);
    if (ok) {
      setSuccessField(key);
      setTimeout(() => setSuccessField(null), 2500);
    }
  };

  const filteredLogs = auditLogs.filter((l) => {
    if (!logFilter) return true;
    const q = logFilter.toLowerCase();
    return (
      l.event.toLowerCase().includes(q) ||
      (l.actorEmail && l.actorEmail.toLowerCase().includes(q)) ||
      (l.targetEmail && l.targetEmail.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#0E8F5D]/10 text-[#0E8F5D]">
            <Shield className="h-4 w-4" />
          </span>
          <Heading as="h2" size="h3" className="text-xl font-bold text-ink">
            Security, Abuse Prevention & Risk Telemetry
          </Heading>
        </div>
        <Text size="body-sm" className="text-ink-secondary mt-1">
          Active sliding-window rate limiters, temporary email blockers, business-domain pooling, and multi-tenant audit logs.
        </Text>
      </div>

      {/* 1. RATE LIMITS MATRIX */}
      <Card padding="lg" className="border-line bg-white shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-line pb-3">
          <div>
            <h3 className="text-sm font-extrabold text-ink">Sliding-Window Rate Limit Ceilings</h3>
            <p className="text-xs text-ink-tertiary">In-memory sliding-window protection with memory reaping.</p>
          </div>
          <Badge variant="success">8 TIERS ACTIVE</Badge>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div className="p-3 rounded-xl bg-[#FAFAF8] border border-line space-y-1">
            <div className="text-ink-tertiary text-[10px] font-bold uppercase">Signups</div>
            <div className="text-base font-extrabold text-ink font-mono">5 / hr</div>
            <div className="text-[10px] text-ink-secondary">Per IP sliding window</div>
          </div>
          <div className="p-3 rounded-xl bg-[#FAFAF8] border border-line space-y-1">
            <div className="text-ink-tertiary text-[10px] font-bold uppercase">Auth / Logins</div>
            <div className="text-base font-extrabold text-ink font-mono">10 / min</div>
            <div className="text-[10px] text-ink-secondary">Credential brute force block</div>
          </div>
          <div className="p-3 rounded-xl bg-[#FAFAF8] border border-line space-y-1">
            <div className="text-ink-tertiary text-[10px] font-bold uppercase">Password Resets</div>
            <div className="text-base font-extrabold text-ink font-mono">4 / 15m</div>
            <div className="text-[10px] text-ink-secondary">Email flooding prevention</div>
          </div>
          <div className="p-3 rounded-xl bg-[#FAFAF8] border border-line space-y-1">
            <div className="text-ink-tertiary text-[10px] font-bold uppercase">Email Verify</div>
            <div className="text-base font-extrabold text-ink font-mono">6 / 15m</div>
            <div className="text-[10px] text-ink-secondary">User verification throttle</div>
          </div>
          <div className="p-3 rounded-xl bg-[#FAFAF8] border border-line space-y-1">
            <div className="text-ink-tertiary text-[10px] font-bold uppercase">Expensive Search</div>
            <div className="text-base font-extrabold text-ink font-mono">40 / min</div>
            <div className="text-[10px] text-ink-secondary">Keyword & Product engines</div>
          </div>
          <div className="p-3 rounded-xl bg-[#FAFAF8] border border-line space-y-1">
            <div className="text-ink-tertiary text-[10px] font-bold uppercase">Etsy Proxies</div>
            <div className="text-base font-extrabold text-ink font-mono">30 / min</div>
            <div className="text-[10px] text-ink-secondary">Queue ceiling 8 req/sec</div>
          </div>
          <div className="p-3 rounded-xl bg-[#FAFAF8] border border-line space-y-1">
            <div className="text-ink-tertiary text-[10px] font-bold uppercase">AI Generation</div>
            <div className="text-base font-extrabold text-ink font-mono">15 / min</div>
            <div className="text-[10px] text-ink-secondary">Content Studio & SaltBot</div>
          </div>
          <div className="p-3 rounded-xl bg-[#FAFAF8] border border-line space-y-1">
            <div className="text-ink-tertiary text-[10px] font-bold uppercase">Admin Actions</div>
            <div className="text-base font-extrabold text-ink font-mono">120 / min</div>
            <div className="text-[10px] text-ink-secondary">Administrative API rate</div>
          </div>
        </div>
      </Card>

      {/* 2. DISPOSABLE EMAIL & BUSINESS DOMAIN POLICY */}
      <Card padding="lg" className="border-line bg-white shadow-xs space-y-5">
        <div className="flex items-center justify-between border-b border-line pb-3">
          <div>
            <h3 className="text-sm font-extrabold text-ink">Free Account Abuse & Domain Rules</h3>
            <p className="text-xs text-ink-tertiary">250+ known temporary domains blocked; public webmail allowlisted.</p>
          </div>
          <Badge variant="neutral">Domain Policy</Badge>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-ink flex items-center justify-between">
              <span>Max Free Accounts / Business Domain</span>
              {successField === "max_free" && <span className="text-[10px] text-[#0E8F5D] font-bold">Saved!</span>}
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                min="1"
                max="10"
                value={maxFreeDraft}
                onChange={(e) => setMaxFreeDraft(e.target.value)}
                className="w-24 text-xs border border-line rounded-lg px-3 py-2 font-mono"
              />
              <Button
                variant="secondary"
                size="compact"
                loading={savingField === "max_free"}
                onClick={() => handleSave("max_free_accounts_per_business_domain", maxFreeDraft)}
                className="text-xs"
              >
                Save Limit
              </Button>
            </div>
            <p className="text-[11px] text-ink-tertiary">
              Limits independent free workspaces created on custom corporate domains.
            </p>
          </div>

          <div className="space-y-2 lg:col-span-2">
            <label className="text-xs font-bold text-ink flex items-center justify-between">
              <span>Custom Disposable Domains Blocklist (Comma-separated)</span>
              {successField === "disposable" && <span className="text-[10px] text-[#0E8F5D] font-bold">Saved!</span>}
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={disposableDraft}
                onChange={(e) => setDisposableDraft(e.target.value)}
                placeholder="e.g. badmail.com, spammail.net"
                className="flex-1 text-xs border border-line rounded-lg px-3 py-2 font-mono"
              />
              <Button
                variant="secondary"
                size="compact"
                loading={savingField === "disposable"}
                onClick={() => handleSave("disposable_email_domains_custom", disposableDraft)}
                className="text-xs"
              >
                Save
              </Button>
            </div>
            <p className="text-[11px] text-ink-tertiary">
              Appended to SellerSalt's built-in 250+ disposable domain database.
            </p>
          </div>
        </div>
      </Card>

      {/* 3. AUDIT LOGS STREAM */}
      <Card padding="lg" className="border-line bg-white shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-line pb-3">
          <div>
            <h3 className="text-sm font-extrabold text-ink">Administrative & Security Audit Logs</h3>
            <p className="text-xs text-ink-tertiary">Durable audit trail for sensitive administrative operations.</p>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-tertiary" />
              <input
                type="text"
                value={logFilter}
                onChange={(e) => setLogFilter(e.target.value)}
                placeholder="Filter event or email..."
                className="text-xs pl-8 pr-3 py-1.5 border border-line rounded-lg w-48 bg-white"
              />
            </div>
            <Button
              variant="secondary"
              size="compact"
              onClick={onRefreshAuditLogs}
              className="text-xs"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto max-h-96">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-line text-[10px] font-bold text-ink-tertiary uppercase">
                <th className="py-2 px-3">Timestamp</th>
                <th className="py-2 px-3">Event Type</th>
                <th className="py-2 px-3">Actor</th>
                <th className="py-2 px-3">Target</th>
                <th className="py-2 px-3">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line font-mono text-[11px]">
              {filteredLogs.slice(0, 30).map((log) => (
                <tr key={log.id} className="hover:bg-[#FAFAF8]">
                  <td className="py-2 px-3 text-ink-tertiary whitespace-nowrap">
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                  <td className="py-2 px-3 font-bold text-ink">
                    <span className="px-1.5 py-0.5 rounded bg-[#F4F3EF]">{log.event}</span>
                  </td>
                  <td className="py-2 px-3 text-ink">{log.actorEmail || "SYSTEM"}</td>
                  <td className="py-2 px-3 text-ink-secondary">{log.targetEmail || "—"}</td>
                  <td className="py-2 px-3 text-ink-tertiary truncate max-w-xs" title={JSON.stringify(log.metadata)}>
                    {log.metadata ? JSON.stringify(log.metadata) : "—"}
                  </td>
                </tr>
              ))}
              {filteredLogs.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-ink-tertiary font-sans">
                    No matching audit log records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
