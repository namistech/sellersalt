"use client";

import React, { useState } from "react";
import { Store, ShoppingBag, User } from "lucide-react";
import { resolveAssetUrl } from "@/lib/asset-url";

export function normalizeImageUrl(url?: string | null): string | null {
  return resolveAssetUrl(url);
}

export interface SafeImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, "src"> {
  src?: string | null;
  alt: string;
  fallbackType?: "product" | "shop" | "avatar";
  fallbackText?: string;
  className?: string;
}

export function SafeImage({
  src,
  alt,
  fallbackType = "product",
  fallbackText,
  className = "",
  ...props
}: SafeImageProps) {
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  const normalizedSrc = normalizeImageUrl(src);
  const isValidUrl = Boolean(normalizedSrc && !hasError);

  if (!isValidUrl) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-[#FAFAF8] border border-line-subtle text-ink-tertiary ${className}`}
        aria-label={alt}
      >
        {fallbackType === "shop" ? (
          <Store className="h-6 w-6 text-[#0E8F5D] opacity-40 mb-1" />
        ) : fallbackType === "avatar" ? (
          <User className="h-6 w-6 text-[#0E8F5D] opacity-40 mb-1" />
        ) : (
          <ShoppingBag className="h-6 w-6 text-[#0E8F5D] opacity-40 mb-1" />
        )}
        {fallbackText && (
          <span className="text-[10px] font-semibold text-ink-tertiary uppercase tracking-wider">
            {fallbackText}
          </span>
        )}
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={normalizedSrc!}
      alt={alt}
      onError={() => setHasError(true)}
      onLoad={() => setIsLoaded(true)}
      className={`${className} ${!isLoaded ? "opacity-0" : "opacity-100"} transition-opacity duration-200`}
      {...props}
    />
  );
}
