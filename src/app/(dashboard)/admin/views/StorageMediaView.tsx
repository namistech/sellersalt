"use client";

import React, { useState } from "react";
import {
  Image as ImageIcon,
  Upload,
  Trash2,
  Copy,
  Check,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  HardDrive,
  FileText,
  Eye,
} from "lucide-react";
import {
  Card,
  Heading,
  Text,
  Badge,
  Button,
  Alert,
  SafeImage,
} from "@/components/ui";
import { resolveAssetUrl } from "@/lib/asset-url";

interface MediaAsset {
  id: string;
  name: string;
  url: string;
  type: string;
  size: string;
  uploadDate: string;
  usageLabel?: string;
  isReferenced?: boolean;
}

interface StorageMediaViewProps {
  onUploadAsset: (file: File) => Promise<string | null>;
  activeLogoUrl?: string;
  activeFaviconUrl?: string;
  activeAuthImageUrl?: string;
}

export function StorageMediaView({
  onUploadAsset,
  activeLogoUrl,
  activeFaviconUrl,
  activeAuthImageUrl,
}: StorageMediaViewProps) {
  const [uploading, setUploading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deleteWarning, setDeleteWarning] = useState<string | null>(null);

  // Core system assets and library
  const [assets, setAssets] = useState<MediaAsset[]>([
    {
      id: "logo-main",
      name: "sellersalt-brand-logo.png",
      url: activeLogoUrl || "/logo.png",
      type: "PNG",
      size: "48 KB",
      uploadDate: "System Default",
      usageLabel: "Primary App Logo",
      isReferenced: true,
    },
    {
      id: "favicon-main",
      name: "favicon-icon.ico",
      url: activeFaviconUrl || "/favicon.ico",
      type: "ICO",
      size: "16 KB",
      uploadDate: "System Default",
      usageLabel: "Browser Favicon",
      isReferenced: true,
    },
    {
      id: "auth-cover",
      name: "sellersalt-auth-hero.jpg",
      url: activeAuthImageUrl || "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=1200&auto=format&fit=crop&q=80",
      type: "JPEG",
      size: "245 KB",
      uploadDate: "Active Artwork",
      usageLabel: "Login Page Artwork",
      isReferenced: true,
    },
  ]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const url = await onUploadAsset(file);
    setUploading(false);
    if (url) {
      const newAsset: MediaAsset = {
        id: `upload-${Date.now()}`,
        name: file.name,
        url,
        type: file.type.split("/")[1]?.toUpperCase() || "IMAGE",
        size: `${Math.round(file.size / 1024)} KB`,
        uploadDate: new Date().toLocaleDateString(),
        usageLabel: "Unassigned Upload",
        isReferenced: false,
      };
      setAssets((prev) => [newAsset, ...prev]);
    }
  };

  const handleCopyUrl = (url: string, id: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDelete = (asset: MediaAsset) => {
    if (asset.isReferenced) {
      setDeleteWarning(`Cannot delete "${asset.name}" because it is actively referenced as "${asset.usageLabel}". Please reassign the setting first.`);
      setTimeout(() => setDeleteWarning(null), 4000);
      return;
    }
    setAssets((prev) => prev.filter((a) => a.id !== asset.id));
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#0E8F5D]/10 text-[#0E8F5D]">
              <ImageIcon className="h-4 w-4" />
            </span>
            <Heading as="h2" size="h3" className="text-xl font-bold text-ink">
              Internal Media & Asset Storage Library
            </Heading>
          </div>
          <Text size="body-sm" className="text-ink-secondary mt-1">
            Upload, preview, and manage persistent visual brand assets, logos, and marketing imagery.
          </Text>
        </div>

        <label>
          <span className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#0E8F5D] hover:bg-[#0C7A52] text-white text-xs font-bold shadow-xs cursor-pointer transition">
            <Upload className="h-4 w-4" />
            {uploading ? "Uploading..." : "Upload Asset"}
          </span>
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif,image/x-icon,image/svg+xml"
            onChange={handleUpload}
            className="hidden"
          />
        </label>
      </div>

      {deleteWarning && (
        <Alert variant="warning">
          <strong>Protected System Asset:</strong> {deleteWarning}
        </Alert>
      )}

      {/* Media Assets Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {assets.map((asset) => (
          <Card key={asset.id} padding="lg" className="border-line bg-white shadow-xs space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              {/* Asset Preview Container */}
              <div className="h-40 w-full rounded-xl bg-[#FAFAF8] border border-line flex items-center justify-center p-3 overflow-hidden relative group">
                <SafeImage
                  src={resolveAssetUrl(asset.url)}
                  alt={asset.name}
                  fallbackType="product"
                  className="max-h-full max-w-full object-contain rounded"
                />
                <a
                  href={resolveAssetUrl(asset.url) || asset.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 text-white opacity-0 group-hover:opacity-100 transition"
                  title="Open full size"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>

              {/* Asset Metadata */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-extrabold text-ink truncate" title={asset.name}>
                    {asset.name}
                  </h4>
                  <Badge variant={asset.isReferenced ? "success" : "neutral"} className="text-label-sm">
                    {asset.type}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-meta text-ink-tertiary">
                  <span>{asset.size}</span>
                  <span>{asset.uploadDate}</span>
                </div>
                {asset.usageLabel && (
                  <div className="text-label-sm text-[#0E8F5D] font-bold">
                    ✓ {asset.usageLabel}
                  </div>
                )}
              </div>
            </div>

            {/* Action Bar */}
            <div className="flex items-center justify-between pt-2 border-t border-line">
              <button
                type="button"
                onClick={() => handleCopyUrl(asset.url, asset.id)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-ink-secondary hover:text-ink"
              >
                {copiedId === asset.id ? <Check className="h-3.5 w-3.5 text-[#0E8F5D]" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copiedId === asset.id ? "URL Copied" : "Copy URL"}</span>
              </button>

              <button
                type="button"
                onClick={() => handleDelete(asset)}
                className={`p-1.5 rounded-lg text-xs transition ${
                  asset.isReferenced
                    ? "text-ink-tertiary hover:text-amber-700 cursor-not-allowed"
                    : "text-ink-tertiary hover:text-red-600 hover:bg-red-50"
                }`}
                title={asset.isReferenced ? "Actively in use" : "Delete asset"}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
