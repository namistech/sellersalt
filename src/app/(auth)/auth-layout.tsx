"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export function AuthLayout({ children }: { children: React.ReactNode }) {
  const [branding, setBranding] = useState<{
    logoUrl: string | null;
    imageUrl: string | null;
    imagePositionX: number;
    imagePositionY: number;
  }>({
    logoUrl: null,
    imageUrl: null,
    imagePositionX: 50,
    imagePositionY: 50,
  });

  useEffect(() => {
    fetch("/api/settings/branding")
      .then((r) => r.json())
      .then((data) => {
        if (data.settings) {
          const x = Number(data.settings.auth_page_image_position_x);
          const y = Number(data.settings.auth_page_image_position_y);
          setBranding({
            logoUrl: data.settings.auth_page_logo_url || null,
            imageUrl: data.settings.auth_page_image_url || null,
            imagePositionX: Number.isFinite(x) && x >= 0 && x <= 100 ? x : 50,
            imagePositionY: Number.isFinite(y) && y >= 0 && y <= 100 ? y : 50,
          });
        }
      })
      .catch(() => {});
  }, []);

  return (
    <div className="flex min-h-screen">
      <div className="flex w-full flex-col justify-center px-6 py-12 sm:px-12 lg:w-1/2 lg:px-20">
        <div className="mx-auto w-full max-w-sm">
          <Link href="/" className="mb-10 flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={branding.logoUrl || "/brand/wordmark.png"} alt="SellerSalt" className="h-8 w-auto" />
          </Link>
          {children}
        </div>
      </div>

      <div className="relative hidden w-1/2 items-center justify-center overflow-hidden bg-[#0B2B22] lg:flex">
        <div className="absolute left-10 top-10 opacity-40">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={branding.logoUrl || "/brand/icon-mark.png"} alt="" className="h-10 w-auto brightness-0 invert" />
        </div>

        {branding.imageUrl ? (
          <div className="relative w-[85%] h-[80%] overflow-hidden rounded-2xl border border-white/10 shadow-2xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={branding.imageUrl}
              alt=""
              className="h-full w-full object-cover"
              style={{ objectPosition: `${branding.imagePositionX}% ${branding.imagePositionY}%` }}
            />
          </div>
        ) : (
          <div className="px-16 text-center">
            <div className="mb-3 text-2xl font-semibold text-white">Real sales data.</div>
            <div className="text-2xl font-semibold text-white/70">No guesswork.</div>
          </div>
        )}
      </div>
    </div>
  );
}
