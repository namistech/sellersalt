"use client";

import React, { useState } from "react";
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Eye,
  EyeOff,
  Copy,
  Check,
  ExternalLink,
  Loader2,
  RefreshCw,
  HelpCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

export interface IntegrationField {
  key: string;
  label: string;
  placeholder?: string;
  isSecret?: boolean;
  hasValue?: boolean;
  value?: string;
  instructions: string;
  type?: "text" | "password" | "select" | "url";
  options?: Array<{ label: string; value: string }>;
}

export interface CallbackUrl {
  label: string;
  description?: string;
  url: string;
}

export interface IntegrationCardProps {
  id: string;
  category: "Marketplace" | "Productivity" | "Accounting" | "CMS" | "AI & Infrastructure";
  name: string;
  description: string;
  icon?: React.ReactNode;
  status: "CONFIGURED" | "CONNECTED" | "NOT_CONFIGURED" | "COMING_SOON" | "DISABLED";
  statusBadgeText?: string;
  fields: IntegrationField[];
  callbackUrls?: CallbackUrl[];
  documentationUrl?: string;
  documentationLabel?: string;
  provenanceBadge?: "[ACTUAL ETSY DATA]" | "[ESTIMATED]" | "[SELLERSALT SCORE]" | "[EXTERNAL DATA]";
  onSave: (updates: Record<string, string>) => Promise<boolean>;
  onTestConnection?: () => Promise<{ ok: boolean; message: string }>;
  onReset?: () => Promise<boolean>;
}

export function IntegrationCard({
  id,
  category,
  name,
  description,
  icon,
  status,
  statusBadgeText,
  fields,
  callbackUrls,
  documentationUrl,
  documentationLabel = "Developer Portal / Setup Docs",
  provenanceBadge,
  onSave,
  onTestConnection,
  onReset,
}: IntegrationCardProps) {
  const [fieldValues, setFieldValues] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const f of fields) {
      initial[f.key] = f.value || "";
    }
    return initial;
  });

  const [visibleSecrets, setVisibleSecrets] = useState<Record<string, boolean>>({});
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const toggleSecret = (key: string) => {
    setVisibleSecrets((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const copyToClipboard = async (text: string, identifier: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(identifier);
      setTimeout(() => setCopiedKey(null), 2500);
    } catch {
      // Fallback
    }
  };

  const handleFieldChange = (key: string, value: string) => {
    setFieldValues((prev) => ({ ...prev, [key]: value }));
    setSaveSuccess(false);
    setSaveError(null);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    setSaveError(null);
    try {
      const ok = await onSave(fieldValues);
      if (ok) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 4000);
      } else {
        setSaveError("Failed to update credentials. Please check logs.");
      }
    } catch (err: any) {
      setSaveError(err.message || "An error occurred while saving.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleTest = async () => {
    if (!onTestConnection) return;
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await onTestConnection();
      setTestResult(res);
    } catch (err: any) {
      setTestResult({ ok: false, message: err.message || "Diagnostic test request failed." });
    } finally {
      setIsTesting(false);
    }
  };

  const getStatusBadge = () => {
    if (statusBadgeText) {
      return (
        <Badge variant={status === "CONFIGURED" || status === "CONNECTED" ? "success" : "neutral"}>
          {statusBadgeText}
        </Badge>
      );
    }
    switch (status) {
      case "CONFIGURED":
      case "CONNECTED":
        return (
          <Badge variant="success">
            Configured & Ready
          </Badge>
        );
      case "COMING_SOON":
        return (
          <Badge variant="info">
            Roadmap / Coming Soon
          </Badge>
        );
      case "DISABLED":
        return (
          <Badge variant="neutral">
            Disabled
          </Badge>
        );
      case "NOT_CONFIGURED":
      default:
        return (
          <Badge variant="warning">
            Not Configured
          </Badge>
        );
    }
  };

  return (
    <div
      id={`integration-${id}`}
      className="p-6 rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] shadow-sm hover:shadow transition-shadow flex flex-col justify-between"
    >
      {/* Header */}
      <div>
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-[var(--color-paper)] border border-[var(--color-line)] flex items-center justify-center text-xl shrink-0">
              {icon || "🔌"}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-lg text-[var(--color-ink)]">{name}</h3>
                {provenanceBadge && (
                  <Badge variant="neutral">
                    {provenanceBadge}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs font-mono uppercase tracking-wider text-[var(--color-ink-muted)]">
                  {category}
                </span>
              </div>
            </div>
          </div>
          <div className="shrink-0">{getStatusBadge()}</div>
        </div>

        <p className="text-sm text-[var(--color-ink-muted)] leading-relaxed mb-5">{description}</p>

        {/* Callbacks & Redirect URIs */}
        {callbackUrls && callbackUrls.length > 0 && (
          <div className="mb-5 p-3.5 rounded-xl bg-[var(--color-paper)] border border-[var(--color-line)] space-y-2.5">
            <div className="text-xs font-medium text-[var(--color-ink)] flex items-center gap-1.5">
              <span>Required Redirect / Callback URLs</span>
              <span className="text-[var(--color-ink-muted)] text-[11px]">(Copy to your Developer Portal)</span>
            </div>
            {callbackUrls.map((cb, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex items-center justify-between text-xs text-[var(--color-ink-muted)]">
                  <span className="font-medium text-[var(--color-ink)]">{cb.label}</span>
                  {cb.description && <span className="text-[11px]">{cb.description}</span>}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={cb.url}
                    className="w-full text-xs font-mono bg-[var(--color-surface)] border border-[var(--color-line)] px-2.5 py-1.5 rounded-lg text-[var(--color-ink)] select-all focus:outline-none"
                  />
                  <Button
                    size="compact"
                    variant="secondary"
                    className="shrink-0 h-8 px-2.5 text-xs flex items-center gap-1.5"
                    onClick={() => copyToClipboard(cb.url, `${id}-cb-${idx}`)}
                  >
                    {copiedKey === `${id}-cb-${idx}` ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-700">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Input Fields */}
        {fields.length > 0 && (
          <div className="space-y-3.5 mb-5">
            {fields.map((field) => {
              const isMasked = field.isSecret && !visibleSecrets[field.key];
              const isConfigured = field.hasValue || Boolean(fieldValues[field.key]);

              return (
                <div key={field.key} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor={`input-${field.key}`}
                      className="text-xs font-medium text-[var(--color-ink)] flex items-center gap-1.5"
                    >
                      <span>{field.label}</span>
                      {field.isSecret && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--color-paper)] text-[var(--color-ink-muted)] border border-[var(--color-line)]">
                          Encrypted
                        </span>
                      )}
                    </label>
                    {isConfigured && (
                      <span className="text-[11px] text-emerald-700 font-medium flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        Set
                      </span>
                    )}
                  </div>

                  <div className="relative flex items-center">
                    {field.type === "select" ? (
                      <select
                        id={`input-${field.key}`}
                        value={fieldValues[field.key] || ""}
                        onChange={(e) => handleFieldChange(field.key, e.target.value)}
                        className="w-full text-xs bg-[var(--color-paper)] border border-[var(--color-line)] px-3 py-2 rounded-xl text-[var(--color-ink)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-primary)]"
                      >
                        {field.options?.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        id={`input-${field.key}`}
                        type={isMasked ? "password" : field.type || "text"}
                        placeholder={field.placeholder || (field.isSecret ? "••••••••••••••••" : "")}
                        value={fieldValues[field.key] || ""}
                        onChange={(e) => handleFieldChange(field.key, e.target.value)}
                        className="w-full text-xs font-mono bg-[var(--color-paper)] border border-[var(--color-line)] px-3 py-2 rounded-xl text-[var(--color-ink)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-primary)] pr-10"
                      />
                    )}

                    {field.isSecret && (
                      <button
                        type="button"
                        onClick={() => toggleSecret(field.key)}
                        className="absolute right-2.5 p-1 text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
                        title={visibleSecrets[field.key] ? "Hide Secret" : "Reveal Secret"}
                      >
                        {visibleSecrets[field.key] ? (
                          <EyeOff className="w-3.5 h-3.5" />
                        ) : (
                          <Eye className="w-3.5 h-3.5" />
                        )}
                      </button>
                    )}
                  </div>

                  <p className="text-[11px] text-[var(--color-ink-muted)] leading-normal flex items-start gap-1">
                    <HelpCircle className="w-3 h-3 shrink-0 mt-0.5 text-[var(--color-ink-muted)]" />
                    <span>{field.instructions}</span>
                  </p>
                </div>
              );
            })}
          </div>
        )}

        {/* Diagnostic / Test Result Message */}
        {testResult && (
          <div
            className={`p-3 rounded-xl text-xs mb-4 flex items-start gap-2 ${
              testResult.ok
                ? "bg-emerald-50 text-emerald-900 border border-emerald-200"
                : "bg-rose-50 text-rose-900 border border-rose-200"
            }`}
          >
            {testResult.ok ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            )}
            <div className="flex-1">
              <span className="font-semibold">{testResult.ok ? "Connection Verified: " : "Verification Issue: "}</span>
              <span>{testResult.message}</span>
            </div>
          </div>
        )}

        {saveSuccess && (
          <div className="p-3 rounded-xl text-xs mb-4 bg-emerald-50 text-emerald-900 border border-emerald-200 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Credentials encrypted and saved successfully.</span>
          </div>
        )}

        {saveError && (
          <div className="p-3 rounded-xl text-xs mb-4 bg-rose-50 text-rose-900 border border-rose-200 flex items-center gap-2">
            <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{saveError}</span>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="pt-4 border-t border-[var(--color-line)] flex items-center justify-between gap-3 flex-wrap">
        <div>
          {documentationUrl && (
            <a
              href={documentationUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-[var(--color-brand-primary)] hover:underline inline-flex items-center gap-1 font-medium"
            >
              <span>{documentationLabel}</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>

        <div className="flex items-center gap-2">
          {onTestConnection && (
            <Button
              size="compact"
              variant="secondary"
              onClick={handleTest}
              disabled={isTesting || isSaving}
              className="text-xs h-8 px-3"
            >
              {isTesting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                  Testing...
                </>
              ) : (
                <>
                  <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                  Test Connection
                </>
              )}
            </Button>
          )}

          {fields.length > 0 && (
            <Button
              size="compact"
              variant="primary"
              onClick={handleSave}
              disabled={isSaving || isTesting}
              className="text-xs h-8 px-4 font-medium"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                  Saving...
                </>
              ) : (
                "Save Credentials"
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
