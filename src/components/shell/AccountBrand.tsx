"use client";

import React from "react";
import Link from "next/link";
import { SafeImage } from "@/components/ui/SafeImage";
import { cn } from "@/components/ui";

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

  const brandIcon = (
    <div className="h-8 w-8 shrink-0 rounded-lg overflow-hidden border border-line-subtle shadow-xs flex items-center justify-center bg-[#141B16]">
      {logoUrl ? (
        <SafeImage
          src={logoUrl}
          alt={displayName}
          fallbackType="shop"
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center font-bold text-sm text-[#16C784]">
          {isCustomOrg ? initial : "S"}
        </div>
      )}
    </div>
  );

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
            <span className="block truncate text-[11px] font-medium text-ink-tertiary capitalize">
              {accountType} Workspace
            </span>
          ) : (
            <span className="block truncate text-[11px] font-medium text-[#0E8F5D]">
              Etsy Intelligence
            </span>
          )}
        </div>
      )}
    </Link>
  );
}
