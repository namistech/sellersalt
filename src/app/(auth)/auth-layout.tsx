"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export function AuthLayout({ children }: { children: React.ReactNode }) {
  const [branding, setBranding] = useState<{
    logoUrl: string | null;
    imageUrl: string | null;
    imagePositionX: number;
    imagePositionY: number;
    marginTop: string;
    marginBottom: string;
    marginLeft: string;
    marginRight: string;
    paddingTop: string;
    paddingBottom: string;
    paddingLeft: string;
    paddingRight: string;
    alignment: string;
    fit: string;
    width: string;
    height: string;
    borderRadius: string;
    bgColor: string;
  }>({
    logoUrl: null,
    imageUrl: null,
    imagePositionX: 50,
    imagePositionY: 50,
    marginTop: "0px",
    marginBottom: "0px",
    marginLeft: "0px",
    marginRight: "0px",
    paddingTop: "0px",
    paddingBottom: "0px",
    paddingLeft: "0px",
    paddingRight: "0px",
    alignment: "center",
    fit: "cover",
    width: "85%",
    height: "80%",
    borderRadius: "16px",
    bgColor: "#0B2B22",
  });

  useEffect(() => {
    fetch("/api/settings/branding")
      .then((r) => r.json())
      .then((data) => {
        if (data.settings) {
          const s = data.settings;
          const x = Number(s.auth_page_image_position_x);
          const y = Number(s.auth_page_image_position_y);
          
          const formatPx = (val: any, fallback = "0px") => {
            if (!val && val !== 0) return fallback;
            const str = String(val).trim();
            if (!str) return fallback;
            return str.endsWith("px") || str.endsWith("%") || str.endsWith("rem") ? str : `${str}px`;
          };

          setBranding({
            logoUrl: s.auth_page_logo_url || null,
            imageUrl: s.auth_page_image_url || null,
            imagePositionX: Number.isFinite(x) && x >= 0 && x <= 100 ? x : 50,
            imagePositionY: Number.isFinite(y) && y >= 0 && y <= 100 ? y : 50,
            marginTop: formatPx(s.auth_page_image_margin_top, "0px"),
            marginBottom: formatPx(s.auth_page_image_margin_bottom, "0px"),
            marginLeft: formatPx(s.auth_page_image_margin_left, "0px"),
            marginRight: formatPx(s.auth_page_image_margin_right, "0px"),
            paddingTop: formatPx(s.auth_page_image_padding_top, "0px"),
            paddingBottom: formatPx(s.auth_page_image_padding_bottom, "0px"),
            paddingLeft: formatPx(s.auth_page_image_padding_left, "0px"),
            paddingRight: formatPx(s.auth_page_image_padding_right, "0px"),
            alignment: s.auth_page_image_alignment || "center",
            fit: s.auth_page_image_fit || "cover",
            width: s.auth_page_image_width || "85%",
            height: s.auth_page_image_height || "80%",
            borderRadius: formatPx(s.auth_page_image_border_radius, "16px"),
            bgColor: s.auth_page_image_bg_color || "#0B2B22",
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

      <div
        className="relative hidden w-1/2 overflow-hidden transition-colors lg:flex"
        style={{
          backgroundColor: branding.bgColor,
          paddingTop: branding.paddingTop,
          paddingBottom: branding.paddingBottom,
          paddingLeft: branding.paddingLeft,
          paddingRight: branding.paddingRight,
          justifyContent:
            branding.alignment === "left"
              ? "flex-start"
              : branding.alignment === "right"
              ? "flex-end"
              : "center",
          alignItems: "center",
        }}
      >
        <div className="absolute left-10 top-10 opacity-40 z-10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={branding.logoUrl || "/brand/icon-mark.png"} alt="" className="h-10 w-auto brightness-0 invert" />
        </div>

        {branding.imageUrl ? (
          <div
            className="relative overflow-hidden border border-white/10 shadow-2xl transition-all"
            style={{
              width: branding.width,
              height: branding.height,
              marginTop: branding.marginTop,
              marginBottom: branding.marginBottom,
              marginLeft: branding.marginLeft,
              marginRight: branding.marginRight,
              borderRadius: branding.borderRadius,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={branding.imageUrl}
              alt=""
              className="h-full w-full transition-all"
              style={{
                objectFit: branding.fit as any,
                objectPosition: `${branding.imagePositionX}% ${branding.imagePositionY}%`,
              }}
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
