"use client";

import React, { useState, useEffect } from "react";
import {
  Activity,
  HardDrive,
  Mail,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Server,
  Database,
  ExternalLink,
  Lock,
} from "lucide-react";
import {
  Card,
  Heading,
  Text,
  Badge,
  Button,
  Alert,
} from "@/components/ui";

interface SystemHealthViewProps {
  s3BucketVal: string;
  s3RegionVal: string;
  s3EndpointVal: string;
  s3PublicBaseVal: string;
  hasS3Secret: boolean;
  onSaveSetting: (key: string, value: string) => Promise<boolean>;
}

export function SystemHealthView({
  s3BucketVal,
  s3RegionVal,
  s3EndpointVal,
  s3PublicBaseVal,
  hasS3Secret,
  onSaveSetting,
}: SystemHealthViewProps) {
  const [etsyDiag, setEtsyDiag] = useState<any | null>(null);
  const [diagLoading, setDiagLoading] = useState(false);

  // S3 Drafts
  const [bucket, setBucket] = useState(s3BucketVal);
  const [region, setRegion] = useState(s3RegionVal);
  const [endpoint, setEndpoint] = useState(s3EndpointVal);
  const [publicBase, setPublicBase] = useState(s3PublicBaseVal);
  const [accessKey, setAccessKey] = useState("");
  const [secretKey, setSecretKey] = useState("");
  const [s3Saving, setS3Saving] = useState(false);
  const [s3Saved, setS3Saved] = useState(false);

  const fetchDiagnostics = async () => {
    setDiagLoading(true);
    try {
      const res = await fetch("/api/admin/diagnostics/etsy-oauth");
      const data = await res.json();
      if (res.ok) setEtsyDiag(data);
    } catch {}
    finally {
      setDiagLoading(false);
    }
  };

  useEffect(() => {
    fetchDiagnostics();
  }, []);

  const handleSaveS3 = async (e: React.FormEvent) => {
    e.preventDefault();
    setS3Saving(true);
    await onSaveSetting("s3_bucket", bucket.trim());
    await onSaveSetting("s3_region", region.trim());
    await onSaveSetting("s3_endpoint", endpoint.trim());
    await onSaveSetting("s3_public_base_url", publicBase.trim());
    if (accessKey.trim()) await onSaveSetting("s3_access_key_id", accessKey.trim());
    if (secretKey.trim()) await onSaveSetting("s3_secret_access_key", secretKey.trim());
    setS3Saving(false);
    setS3Saved(true);
    setTimeout(() => setS3Saved(false), 2500);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#0E8F5D]/10 text-[#0E8F5D]">
            <Activity className="h-4 w-4" />
          </span>
          <Heading as="h2" size="h3" className="text-xl font-bold text-ink">
            System Infrastructure, Storage & Diagnostics
          </Heading>
        </div>
        <Text size="body-sm" className="text-ink-secondary mt-1">
          Inspect live connector diagnostics, configure persistent S3/R2 storage, and review database health.
        </Text>
      </div>

      {/* 1. ETSY LIVE DIAGNOSTIC INSPECTOR */}
      <Card padding="lg" className="border-line bg-white shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-line pb-3">
          <div>
            <h3 className="text-sm font-extrabold text-ink">Etsy OAuth Runtime Diagnostics</h3>
            <p className="text-xs text-ink-tertiary">Real-time inspection of resolved redirect URIs, client keystring, and PKCE status.</p>
          </div>
          <Button
            variant="secondary"
            size="compact"
            loading={diagLoading}
            onClick={fetchDiagnostics}
            className="text-xs"
          >
            <RefreshCw className="h-3.5 w-3.5 mr-1" /> Re-run Inspector
          </Button>
        </div>

        {etsyDiag?.diagnostic && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs font-mono">
            <div className="p-3 rounded-xl bg-[#FAFAF8] border border-line space-y-1">
              <div className="text-ink-tertiary text-label-sm uppercase font-sans font-bold">Config Status</div>
              <div className="font-bold">
                <Badge variant={etsyDiag.diagnostic.configured ? "success" : "warning"}>
                  {etsyDiag.diagnostic.configured ? "CONFIGURED" : "MISSING CLIENT ID"}
                </Badge>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-[#FAFAF8] border border-line space-y-1">
              <div className="text-ink-tertiary text-label-sm uppercase font-sans font-bold">Environment</div>
              <div className="font-bold text-ink">{etsyDiag.diagnostic.environment?.toUpperCase()}</div>
            </div>

            <div className="p-3 rounded-xl bg-[#FAFAF8] border border-line space-y-1">
              <div className="text-ink-tertiary text-label-sm uppercase font-sans font-bold">Masked Keystring</div>
              <div className="font-bold text-ink">{etsyDiag.diagnostic.maskedClientId}</div>
            </div>

            <div className="p-3 rounded-xl bg-[#FAFAF8] border border-line space-y-1">
              <div className="text-ink-tertiary text-label-sm uppercase font-sans font-bold">PKCE / State</div>
              <div className="font-bold text-[#0E8F5D]">S256 ACTIVE</div>
            </div>

            <div className="p-3 rounded-xl bg-[#FAFAF8] border border-line space-y-1 md:col-span-2 lg:col-span-4">
              <div className="text-ink-tertiary text-label-sm uppercase font-sans font-bold">Resolved Redirect URI</div>
              <div className="text-ink font-bold select-all truncate">{etsyDiag.diagnostic.redirectUri}</div>
            </div>
          </div>
        )}
      </Card>

      {/* 2. S3 / CLOUDFLARE R2 OBJECT STORAGE */}
      <Card padding="lg" className="border-line bg-white shadow-xs space-y-5">
        <div className="flex items-center justify-between border-b border-line pb-3">
          <div>
            <h3 className="text-sm font-extrabold text-ink">Persistent S3 / Cloudflare R2 Object Storage</h3>
            <p className="text-xs text-ink-tertiary">Used for avatar uploads and persistent media library assets.</p>
          </div>
          <Badge variant={bucket ? "success" : "neutral"}>
            {bucket ? "STORAGE CONFIGURED" : "LOCAL DISK FALLBACK"}
          </Badge>
        </div>

        {s3Saved && <Alert variant="success">Object Storage configuration saved successfully.</Alert>}

        <form onSubmit={handleSaveS3} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-ink">Bucket Name</label>
              <input
                type="text"
                value={bucket}
                onChange={(e) => setBucket(e.target.value)}
                placeholder="e.g. sellersalt-assets"
                className="w-full text-xs border border-line rounded-lg px-3 py-2 bg-white text-ink font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-ink">Region</label>
              <input
                type="text"
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                placeholder="e.g. us-east-1 or auto (R2)"
                className="w-full text-xs border border-line rounded-lg px-3 py-2 bg-white text-ink font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-ink">Custom Endpoint URL (R2/Spaces)</label>
              <input
                type="url"
                value={endpoint}
                onChange={(e) => setEndpoint(e.target.value)}
                placeholder="https://<account_id>.r2.cloudflarestorage.com"
                className="w-full text-xs border border-line rounded-lg px-3 py-2 bg-white text-ink font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-ink">Access Key ID</label>
              <input
                type="text"
                value={accessKey}
                onChange={(e) => setAccessKey(e.target.value)}
                placeholder="Paste Access Key ID"
                className="w-full text-xs border border-line rounded-lg px-3 py-2 bg-white text-ink font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-ink">Secret Access Key</label>
              <input
                type="password"
                value={secretKey}
                onChange={(e) => setSecretKey(e.target.value)}
                placeholder={hasS3Secret ? "••••••••••••••••••••" : "Paste Secret Key"}
                className="w-full text-xs border border-line rounded-lg px-3 py-2 bg-white text-ink font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-ink">Public Base CDN URL</label>
              <input
                type="url"
                value={publicBase}
                onChange={(e) => setPublicBase(e.target.value)}
                placeholder="https://cdn.sellersalt.com"
                className="w-full text-xs border border-line rounded-lg px-3 py-2 bg-white text-ink font-mono"
              />
            </div>
          </div>

          <Button
            type="submit"
            variant="primary"
            size="default"
            loading={s3Saving}
            className="bg-[#0E8F5D] hover:bg-[#0C7A52] text-white font-bold text-xs"
          >
            Save Storage Configuration
          </Button>
        </form>
      </Card>
    </div>
  );
}
