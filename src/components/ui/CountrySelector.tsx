"use client";

import React from "react";
import { Globe } from "lucide-react";
import { useResearchState } from "@/lib/research-persistence";
import { cn } from "@/components/ui";

export interface CountryOption {
  code: string;
  name: string;
  currency: string;
  flag: string;
}

export const SUPPORTED_MARKETPLACE_COUNTRIES: CountryOption[] = [
  { code: "US", name: "United States", currency: "USD ($)", flag: "🇺🇸" },
  { code: "GB", name: "United Kingdom", currency: "GBP (£)", flag: "🇬🇧" },
  { code: "CA", name: "Canada", currency: "CAD ($)", flag: "🇨🇦" },
  { code: "AU", name: "Australia", currency: "AUD ($)", flag: "🇦🇺" },
  { code: "DE", name: "Germany", currency: "EUR (€)", flag: "🇩🇪" },
  { code: "FR", name: "France", currency: "EUR (€)", flag: "🇫🇷" },
];

export interface CountrySelectorProps {
  className?: string;
  size?: "sm" | "md";
  onChange?: (countryCode: string) => void;
}

export function CountrySelector({ className, size = "sm", onChange }: CountrySelectorProps) {
  const [selectedCountry, setSelectedCountry] = useResearchState<string>(
    "selected_marketplace_country",
    "US"
  );

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value;
    setSelectedCountry(next);
    onChange?.(next);
  }

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-2.5 shadow-2xs transition hover:border-ink-tertiary",
        size === "sm" ? "h-8 text-xs" : "h-10 text-sm",
        className
      )}
    >
      <Globe className="h-3.5 w-3.5 text-[#0E8F5D] shrink-0" />
      <select
        value={selectedCountry}
        onChange={handleChange}
        aria-label="Select Etsy Marketplace Country"
        className="bg-transparent font-semibold text-ink focus:outline-none cursor-pointer pr-1"
      >
        {SUPPORTED_MARKETPLACE_COUNTRIES.map((c) => (
          <option key={c.code} value={c.code} className="bg-white text-ink">
            {c.flag} {c.code} ({c.currency})
          </option>
        ))}
      </select>
    </div>
  );
}
