"use client";

import { useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Menu, X, Flame, LayoutDashboard, ArrowRight, User } from "lucide-react";
import { Button, Avatar } from "@/components/ui";

interface PublicHeaderProps {
  currentPath?: string;
}

export function PublicHeader({ currentPath = "/" }: PublicHeaderProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { data: session, status } = useSession();
  const isAuthenticated = status === "authenticated" && !!session?.user;

  return (
    <header className="sticky top-0 z-50 bg-[#FAFAF8]/90 backdrop-blur-md border-b border-[#E3E6E0]">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/icon-mark.png" alt="" className="w-8 h-8" />
          <span className="font-extrabold text-lg tracking-tight text-[#141B16]">
            SellerSalt
          </span>
        </Link>

        {/* Desktop Nav Links */}
        <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-[#525B55]">
          <Link
            href="/how-it-works"
            className={`hover:text-[#141B16] transition-colors ${
              currentPath === "/how-it-works" ? "text-[#141B16] font-bold" : ""
            }`}
          >
            How It Works
          </Link>
          <Link
            href="/pricing"
            className={`hover:text-[#141B16] transition-colors ${
              currentPath === "/pricing" ? "text-[#141B16] font-bold" : ""
            }`}
          >
            Pricing
          </Link>
          <Link
            href="/trust"
            className={`hover:text-[#141B16] transition-colors ${
              currentPath === "/trust" ? "text-[#141B16] font-bold" : ""
            }`}
          >
            Trust Center
          </Link>
          <Link
            href="/marketplaces"
            className={`hover:text-[#141B16] transition-colors ${
              currentPath === "/marketplaces" ? "text-[#141B16] font-bold" : ""
            }`}
          >
            Marketplaces
          </Link>
          <Link
            href="/#faq"
            className="hover:text-[#141B16] transition-colors"
          >
            FAQ
          </Link>
        </nav>

        {/* Desktop CTAs */}
        <div className="hidden md:flex items-center gap-3">
          {isAuthenticated ? (
            <div className="flex items-center gap-3">
              <Link
                href="/settings/profile"
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-line bg-white hover:bg-[#F4F3EF] text-xs font-medium text-[#141B16] transition-colors"
              >
                <div className="h-5 w-5 rounded-full bg-[#0E8F5D] text-white text-label-sm font-bold flex items-center justify-center">
                  {(session.user?.name || session.user?.email || "U").substring(0, 1).toUpperCase()}
                </div>
                <span className="max-w-[120px] truncate">{session.user?.name || session.user?.email}</span>
              </Link>
              <Link href="/dashboard">
                <Button variant="primary" size="compact" className="text-xs px-3.5 py-1.5 font-semibold bg-[#0E8F5D] hover:bg-[#0C7A52] text-white shadow-xs flex items-center gap-1">
                  <LayoutDashboard className="h-3.5 w-3.5" /> Dashboard <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
            </div>
          ) : (
            <>
              <Link href="/login">
                <Button variant="secondary" size="compact" className="text-xs px-3 py-1.5 font-medium">
                  Sign In
                </Button>
              </Link>
              <Link href="/checkout?plan=PRO">
                <Button variant="primary" size="compact" className="text-xs px-3.5 py-1.5 font-semibold bg-[#0E8F5D] hover:bg-[#0C7A52] text-white shadow-xs">
                  Get Started →
                </Button>
              </Link>
            </>
          )}
        </div>

        {/* Mobile Toggle Button */}
        <div className="flex md:hidden">
          <button
            type="button"
            onClick={() => setMobileOpen(!mobileOpen)}
            className="p-1.5 text-[#141B16] rounded-md hover:bg-[#F4F3EF]"
            aria-label="Toggle navigation menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="md:hidden border-b border-[#E3E6E0] bg-[#FAFAF8] px-6 py-4 space-y-3">
          <Link
            href="/#features"
            onClick={() => setMobileOpen(false)}
            className="block text-sm font-medium text-[#141B16] py-1.5"
          >
            Features
          </Link>
          <Link
            href="/#radar"
            onClick={() => setMobileOpen(false)}
            className="flex items-center gap-1.5 text-sm font-medium text-[#141B16] py-1.5"
          >
            <Flame className="h-4 w-4 text-[#FFB020]" />
            Opportunity Radar
          </Link>
          <Link
            href="/shops"
            onClick={() => setMobileOpen(false)}
            className="block text-sm font-medium text-[#141B16] py-1.5"
          >
            Shop Directory
          </Link>
          <Link
            href="/#pricing"
            onClick={() => setMobileOpen(false)}
            className="block text-sm font-medium text-[#141B16] py-1.5"
          >
            Pricing
          </Link>
          <Link
            href="/contact"
            onClick={() => setMobileOpen(false)}
            className="block text-sm font-medium text-[#141B16] py-1.5"
          >
            Support / Contact
          </Link>

          <div className="pt-3 border-t border-[#E3E6E0] flex flex-col gap-2">
            {isAuthenticated ? (
              <Link href="/dashboard" onClick={() => setMobileOpen(false)}>
                <Button variant="primary" size="default" fullWidth className="bg-[#0E8F5D] text-white">
                  Go to Dashboard →
                </Button>
              </Link>
            ) : (
              <>
                <Link href="/login" onClick={() => setMobileOpen(false)}>
                  <Button variant="secondary" size="default" fullWidth>
                    Sign In
                  </Button>
                </Link>
                <Link href="/checkout?plan=PRO" onClick={() => setMobileOpen(false)}>
                  <Button variant="primary" size="default" fullWidth className="bg-[#141B16] text-white">
                    Get Started
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
