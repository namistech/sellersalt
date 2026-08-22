"use client";

import React from "react";
import Link from "next/link";
import { SafeImage } from "@/components/ui/SafeImage";
import { cn } from "@/components/ui";
import { resolveAssetUrl } from "@/lib/asset-url";

export interface AccountBrandProps {
  organizationName?: string | null;
  logoUrl?: string | null;
  accountType?: "individual" | "agency" | "institute" | string | null;
  collapsed?: boolean;
  className?: string;
  href?: string;
}

export function AccountBrand({
  organizationName,
  logoUrl,
  accountType = "individual",
  collapsed = false,
  className,
  href = "/dashboard",
}: AccountBrandProps) {
  const isCustomOrg = Boolean(organizationName && accountType && accountType !== "individual");
  const displayName = isCustomOrg ? organizationName! : "SellerSalt";
  const initial = displayName.charAt(0).toUpperCase();

  // The square badge always uses the canonical square brand mark, never an
  // admin-uploaded `app_logo_url` — that setting is typically a wide
  // wordmark (icon + text side by side), and force-cropping a wide image
  // into a square with object-cover produces an illegible fragment. Custom
  // per-org logos (isCustomOrg) fall back to an initial letter, same as
  // before, since there's no separate square-icon field for those yet.
  const squareMarkUrl = isCustomOrg ? null : "/brand/icon-mark.png";

  const brandIcon = (
    <div className="h-8 w-8 shrink-0 rounded-lg overflow-hidden border border-line-subtle shadow-xs flex items-center justify-center bg-[#141B16]">
      {squareMarkUrl ? (
        <SafeImage
          src={squareMarkUrl}
          alt={displayName}
          fallbackType="shop"
          className="w-full h-full object-contain p-1"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center font-bold text-sm text-[#16C784]">
          {initial}
        </div>
      )}
    </div>
  );

  // When collapsed, the rail is too narrow for a wide wordmark — always
  // show the square mark. When expanded and the default (non-custom)
  // workspace has a real `app_logo_url` configured, show that full
  // logo (icon + wordmark together, same pattern as the auth pages'
  // `h-8 w-auto` logo) instead of the square badge + separate text label.
  const resolvedLogoUrl = resolveAssetUrl(logoUrl);
  if (!collapsed && !isCustomOrg && resolvedLogoUrl) {
    return (
      <Link
        href={href}
        className={cn("flex items-center transition-opacity hover:opacity-90", className)}
        title={displayName}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={resolvedLogoUrl} alt={displayName} className="h-8 w-auto max-w-[180px] object-contain" />
      </Link>
    );
  }

  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-2.5 transition-opacity hover:opacity-90",
        collapsed && "justify-center",
        className
      )}
      title={displayName}
    >
      {brandIcon}
      {!collapsed && (
        <div className="min-w-0 flex-1">
          <span className="block truncate font-bold text-sm text-ink leading-tight">
            {displayName}
          </span>
          {isCustomOrg ? (
            <span className="block truncate text-xs font-medium text-ink-tertiary capitalize">
              {accountType} Workspace
            </span>
          ) : (
            <span className="block truncate text-xs font-medium text-[#0E8F5D]">
              Etsy Intelligence
            </span>
          )}
        </div>
      )}
    </Link>
  );
}
