"use client";

import { useState } from "react";
import { cn } from "./cn";
import { resolveAssetUrl } from "@/lib/asset-url";

// design-system-v1.md §11 — Avatar: circular, initials fallback, sizes
// 24/32/40px. AvatarGroup is included here too (not a separate file) —
// it's explicitly named alongside Avatar in design-system-v1.md §11
// ("Avatar / Avatar group") as one pairing, and is a trivial
// composition (an overlapping flex stack) rather than independent
// design surface.

export type AvatarSize = "xs" | "sm" | "md" | "lg";

const SIZE_CLASS: Record<AvatarSize, string> = {
  xs: "h-5 w-5 text-[10px]",
  sm: "h-6 w-6 text-label-sm",
  md: "h-8 w-8 text-label-sm",
  lg: "h-10 w-10 text-body-sm",
};

function initialsFrom(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.charAt(0).toUpperCase();
  return (parts[0]!.charAt(0) + parts[parts.length - 1]!.charAt(0)).toUpperCase();
}

export interface AvatarProps {
  src?: string | null;
  /** Used for the initials fallback and as the image alt text. */
  name?: string;
  size?: AvatarSize;
  status?: "connected" | "active" | "inactive" | "disconnected" | "failed";
  className?: string;
}

const STATUS_DOT_CLASS: Record<NonNullable<AvatarProps["status"]>, string> = {
  connected: "bg-success",
  active: "bg-success",
  inactive: "bg-ink-tertiary",
  disconnected: "bg-ink-tertiary",
  failed: "bg-danger",
};

export function Avatar({ src, name, size = "md", status, className }: AvatarProps) {
  const resolvedSrc = resolveAssetUrl(src);
  const [imgFailed, setImgFailed] = useState(false);
  const [prevSrc, setPrevSrc] = useState(resolvedSrc);

  if (resolvedSrc !== prevSrc) {
    setPrevSrc(resolvedSrc);
    setImgFailed(false);
  }

  const showImage = Boolean(resolvedSrc && !imgFailed);

  return (
    <span className={cn("relative inline-flex shrink-0", className)}>
      <span
        className={cn(
          "inline-flex items-center justify-center overflow-hidden rounded-full bg-accent-soft font-medium text-accent",
          SIZE_CLASS[size]
        )}
      >
        {showImage ? (
          // eslint-disable-next-line @next/next/no-img-element -- avatar sources are arbitrary external URLs, not static assets
          <img src={resolvedSrc!} alt={name ?? ""} className="h-full w-full object-cover" onError={() => setImgFailed(true)} />
        ) : (
          <span aria-hidden={Boolean(name)}>{name ? initialsFrom(name) : "?"}</span>
        )}
      </span>
      {status && (
        <span
          aria-hidden="true"
          className={cn("absolute bottom-0 right-0 h-2 w-2 rounded-full ring-2 ring-surface", STATUS_DOT_CLASS[status])}
        />
      )}
    </span>
  );
}

export interface AvatarGroupProps {
  avatars: Array<{ src?: string; name?: string }>;
  size?: AvatarSize;
  /** Maximum avatars shown before collapsing the rest into a "+N" indicator. */
  max?: number;
  className?: string;
}

export function AvatarGroup({ avatars, size = "sm", max = 4, className }: AvatarGroupProps) {
  const visible = avatars.slice(0, max);
  const overflow = avatars.length - visible.length;

  return (
    <span className={cn("flex items-center -space-x-2", className)}>
      {visible.map((a, i) => (
        <Avatar key={i} src={a.src} name={a.name} size={size} className="ring-2 ring-surface" />
      ))}
      {overflow > 0 && (
        <span
          className={cn(
            "inline-flex items-center justify-center rounded-full bg-surface-muted font-medium text-ink-secondary ring-2 ring-surface",
            SIZE_CLASS[size]
          )}
        >
          +{overflow}
        </span>
      )}
    </span>
  );
}
