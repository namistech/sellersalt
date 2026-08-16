"use client";

import { useEffect, useState } from "react";
import { ShieldCheck, RefreshCw, AlertTriangle } from "lucide-react";
import { Card, Button, Heading, Text, Alert, Badge } from "@/components/ui";

// Must match the constant read by extension/content-script.js. Kept as a
// literal (not a shared import) — the extension is a separate, unbundled
// static package, not part of the Next.js build.
const PAIR_MESSAGE_TYPE = "SELLERSALT_EXTENSION_PAIR_CODE";
const PAIR_MESSAGE_SOURCE = "sellersalt-web";

export function ExtensionPairClient() {
  const [code, setCode] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  async function generateCode() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/extension/pair", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate pairing code.");

      const expiry = Date.now() + data.expiresInSeconds * 1000;
      setCode(data.code);
      setExpiresAt(expiry);

      // Relayed to the extension's content script, which forwards it to the
      // background service worker over the MV3 messaging boundary — the
      // page never talks to chrome.runtime directly.
      window.postMessage(
        { source: PAIR_MESSAGE_SOURCE, type: PAIR_MESSAGE_TYPE, code: data.code, expiresAt: expiry },
        window.location.origin
      );
    } catch (err: any) {
      setError(err.message || "Failed to generate pairing code.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    generateCode();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const secondsLeft = expiresAt ? Math.max(0, Math.round((expiresAt - now) / 1000)) : 0;
  const expired = expiresAt !== null && secondsLeft === 0;

  return (
    <div className="max-w-xl space-y-6">
      <div className="space-y-1">
        <Heading as="h1">Connect the Browser Extension</Heading>
        <Text color="secondary">
          Open the SellerSalt extension&apos;s side panel in Chrome while this tab stays open — it pairs
          automatically. The code below is single-use and expires in a few minutes.
        </Text>
      </div>

      <Card padding="lg" className="space-y-4">
        {error && (
          <Alert variant="danger" icon={<AlertTriangle className="h-4 w-4" />}>
            {error}
          </Alert>
        )}

        {code ? (
          <div className="space-y-2">
            <Text size="body-sm" color="secondary">
              Pairing code
            </Text>
            <div className="font-mono text-2xl tracking-wider">{code}</div>
            <Badge variant={expired ? "neutral" : "success"}>
              {expired ? "Expired" : `Expires in ${secondsLeft}s`}
            </Badge>
          </div>
        ) : (
          <Text color="secondary">Generating pairing code…</Text>
        )}

        <Button variant="secondary" onClick={generateCode} disabled={loading} leadingIcon={<RefreshCw className="h-4 w-4" />}>
          Generate new code
        </Button>

        <div className="flex items-start gap-2 text-body-sm text-ink-secondary">
          <ShieldCheck className="h-4 w-4 mt-0.5 shrink-0" />
          <span>
            This code only grants the extension a scoped connection token — never your password, session
            secret, or account credentials.
          </span>
        </div>
      </Card>
    </div>
  );
}
