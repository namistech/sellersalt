import Link from "next/link";

export function PublicFooter() {
  return (
    <footer className="border-t border-[#E3E6E0] bg-[#FAFAF8] text-[#525B55] text-sm mt-auto">
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
          {/* Col 1: Brand */}
          <div className="space-y-3 md:col-span-1">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-[#0E8F5D] text-white font-bold flex items-center justify-center text-xs">
                S
              </div>
              <span className="font-bold text-base text-[#141B16]">
                SellerSalt
              </span>
            </Link>
            <p className="text-xs text-[#7C847E] leading-relaxed">
              First-principles Etsy competitor intelligence, sales velocity tracking, and Opportunity Radar.
            </p>
          </div>

          {/* Col 2: Product */}
          <div>
            <div className="font-semibold text-xs text-[#141B16] uppercase tracking-wider mb-3">
              Intelligence
            </div>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/#radar" className="hover:text-[#141B16] transition-colors">
                  Opportunity Radar
                </Link>
              </li>
              <li>
                <Link href="/shops" className="hover:text-[#141B16] transition-colors">
                  Etsy Shop Directory
                </Link>
              </li>
              <li>
                <Link href="/#features" className="hover:text-[#141B16] transition-colors">
                  Competitor Spy
                </Link>
              </li>
              <li>
                <Link href="/#pricing" className="hover:text-[#141B16] transition-colors">
                  Subscription Plans
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 3: Legal & Trust */}
          <div>
            <div className="font-semibold text-xs text-[#141B16] uppercase tracking-wider mb-3">
              Trust & Legal
            </div>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/terms" className="hover:text-[#141B16] transition-colors">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-[#141B16] transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-[#141B16] transition-colors">
                  Contact Support
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 4: Account */}
          <div>
            <div className="font-semibold text-xs text-[#141B16] uppercase tracking-wider mb-3">
              Get Started
            </div>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/login" className="hover:text-[#141B16] transition-colors">
                  Customer Sign In
                </Link>
              </li>
              <li>
                <Link href="/checkout?plan=PRO" className="hover:text-[#141B16] transition-colors">
                  Start 3-Day Trial ($1)
                </Link>
              </li>
              <li>
                <Link href="/forgot-password" className="hover:text-[#141B16] transition-colors">
                  Reset Password
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom copyright line */}
        <div className="border-t border-[#E3E6E0] pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#7C847E]">
          <div>
            &copy; {new Date().getFullYear()} SellerSalt. All rights reserved.
          </div>
          <div className="flex items-center gap-4">
            <Link href="/terms" className="hover:underline">Terms</Link>
            <span>·</span>
            <Link href="/privacy" className="hover:underline">Privacy</Link>
            <span>·</span>
            <Link href="/contact" className="hover:underline">Support</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
