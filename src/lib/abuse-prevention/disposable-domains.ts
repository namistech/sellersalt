/**
 * SellerSalt Canonical Disposable & Temporary Email Prevention System
 * 
 * Protects Free Explorer and trial registrations from disposable/temporary
 * email abuse while explicitly allowing all legitimate mainstream providers
 * (Gmail, Google Workspace, Yahoo, Outlook, Hotmail, iCloud, Proton, etc.).
 */

import { getSetting } from "@/lib/app-settings";

// --------------------------------------------------------------------------
// 1. Legitimate Public Webmail Providers (Explicit Allowlist)
// --------------------------------------------------------------------------
export const LEGITIMATE_PUBLIC_PROVIDERS = new Set([
  "gmail.com",
  "googlemail.com",
  "yahoo.com",
  "ymail.com",
  "rocketmail.com",
  "yahoo.co.uk",
  "yahoo.ca",
  "yahoo.fr",
  "yahoo.de",
  "yahoo.es",
  "yahoo.it",
  "yahoo.com.br",
  "yahoo.co.in",
  "yahoo.co.jp",
  "outlook.com",
  "hotmail.com",
  "live.com",
  "msn.com",
  "passport.com",
  "hotmail.co.uk",
  "hotmail.fr",
  "hotmail.de",
  "hotmail.es",
  "hotmail.it",
  "icloud.com",
  "me.com",
  "mac.com",
  "proton.me",
  "protonmail.com",
  "protonmail.ch",
  "pm.me",
  "zoho.com",
  "zohomail.com",
  "aol.com",
  "aim.com",
  "gmx.com",
  "gmx.net",
  "gmx.de",
  "mail.com",
  "email.com",
  "fastmail.com",
  "fastmail.fm",
  "hey.com",
  "tutanota.com",
  "tuta.io",
  "tuta.com",
  "yandex.com",
  "yandex.ru",
  "mail.ru",
  "inbox.lv",
  "naver.com",
  "daum.net",
  "hanmail.net",
  "qq.com",
  "163.com",
  "126.com",
  "sina.com",
  "sohu.com",
  "rediffmail.com",
  "comcast.net",
  "sbcglobal.net",
  "att.net",
  "verizon.net",
  "cox.net",
  "charter.net",
  "bell.net",
  "shaw.ca",
  "btinternet.com",
  "virginmedia.com",
  "sky.com",
  "orange.fr",
  "free.fr",
  "sfr.fr",
  "laposte.net",
  "wanadoo.fr",
  "t-online.de",
  "web.de",
  "freenet.de",
  "libero.it",
  "virgilio.it",
  "tiscali.it",
  "telecomitalia.it",
  "terra.com.br",
  "uol.com.br",
  "bol.com.br",
]);

// --------------------------------------------------------------------------
// 2. Curated Maintained Disposable / Temporary Email Domains
// --------------------------------------------------------------------------
const BUILTIN_DISPOSABLE_DOMAINS = new Set([
  // Popular temporary email services
  "10minutemail.com",
  "10minutemail.net",
  "10minutemail.org",
  "10minutemailbox.com",
  "20minutemail.com",
  "20minutemail.it",
  "tempmail.com",
  "temp-mail.org",
  "temp-mail.io",
  "temp-mail.info",
  "tempail.com",
  "tempm.com",
  "mailinator.com",
  "mailinator2.com",
  "guerrillamail.com",
  "guerrillamail.info",
  "guerrillamail.biz",
  "guerrillamail.de",
  "guerrillamail.net",
  "guerrillamail.org",
  "guerrillamailblock.com",
  "sharklasers.com",
  "grr.la",
  "pokemail.net",
  "spam4.me",
  "yopmail.com",
  "yopmail.fr",
  "yopmail.net",
  "cool.fr.nf",
  "jetable.fr.nf",
  "nospam.ze.tc",
  "nomail.xl.cx",
  "mega.zik.dj",
  "speed.1s.fr",
  "courriel.fr.nf",
  "moncourrier.fr.nf",
  "monemail.fr.nf",
  "monmail.fr.nf",
  "trashmail.com",
  "trashmail.net",
  "trashmail.org",
  "trashmail.me",
  "trashmail.at",
  "trashmail.io",
  "trashmail.ws",
  "dispostable.com",
  "getnada.com",
  "nada.ltd",
  "nada.email",
  "inboxkitten.com",
  "throwawaymail.com",
  "fakeinbox.com",
  "mohmal.com",
  "mytemp.email",
  "crazymailing.com",
  "burnermail.io",
  "dropmail.me",
  "emkei.cz",
  "getairmail.com",
  "harakirimail.com",
  "incognitomail.com",
  "mailcatch.com",
  "maildrop.cc",
  "mailnesia.com",
  "mailsac.com",
  "minuteinbox.com",
  "mytempemail.com",
  "sharklasers.com",
  "spambog.com",
  "spamevader.com",
  "spamex.com",
  "spamfree24.org",
  "spamgourmet.com",
  "tempinbox.com",
  "tempr.email",
  "throwawayemailaddress.com",
  "tmail.ws",
  "whyspam.me",
  "disposablemail.com",
  "disposableaddress.com",
  "discard.email",
  "discardmail.com",
  "spambox.us",
  "deadaddress.com",
  "anonymbox.com",
  "kasmail.com",
  "mailexpire.com",
  "mailnull.com",
  "mintemail.com",
  "noclickemail.com",
  "nowmymail.com",
  "objectmail.com",
  "oneoffmail.com",
  "onewaymail.com",
  "safetymail.info",
  "safersignup.com",
  "shortmail.net",
  "sneakemail.com",
  "sofort-mail.de",
  "superrito.com",
  "teleworm.us",
  "trbvm.com",
  "wegwerfmail.de",
  "wegwerfmail.net",
  "wegwerfmail.org",
  "zippymail.info",
  "tempmailaddress.com",
  "tempmailgen.com",
  "generator.email",
  "emailondeck.com",
  "emailfake.com",
  "fake-box.com",
  "inboxbear.com",
  "internxt.com/temporary-email",
  "luxusmail.org",
  "mytrashmail.com",
  "mytempemail.com",
  "owlymail.com",
  "privatemail.com",
  "receive-sms.cc",
  "smailpro.com",
  "tmailor.com",
  "tmpmail.net",
  "tmpmail.org",
  "vmani.com",
  "zoemail.org",
]);

// --------------------------------------------------------------------------
// 3. Domain Normalization & Classification
// --------------------------------------------------------------------------

export type EmailProviderType = "PUBLIC_WEBMAIL" | "DISPOSABLE" | "BUSINESS_DOMAIN" | "INVALID";

export interface EmailDomainAnalysis {
  normalizedEmail: string;
  normalizedDomain: string;
  providerType: EmailProviderType;
  isDisposable: boolean;
  isPublicWebmail: boolean;
  isBusinessDomain: boolean;
  isValid: boolean;
  error?: string;
}

/**
 * Normalizes an email address and extracts its canonical domain.
 */
export function normalizeEmail(email: string): { email: string; domain: string; localPart: string } | null {
  if (!email || typeof email !== "string") return null;

  const trimmed = email.trim().toLowerCase();
  const atIndex = trimmed.lastIndexOf("@");
  if (atIndex <= 0 || atIndex === trimmed.length - 1) return null;

  const localPart = trimmed.slice(0, atIndex);
  let domain = trimmed.slice(atIndex + 1).trim();

  // Strip trailing dots and brackets
  domain = domain.replace(/^\.+|\.+$/g, "").replace(/^\[|\]$/g, "");

  if (!domain || !domain.includes(".")) return null;

  return { email: `${localPart}@${domain}`, domain, localPart };
}

/**
 * Analyzes an email address and checks for disposable/temporary domains.
 */
export async function analyzeEmailDomain(email: string): Promise<EmailDomainAnalysis> {
  const norm = normalizeEmail(email);
  if (!norm) {
    return {
      normalizedEmail: "",
      normalizedDomain: "",
      providerType: "INVALID",
      isDisposable: false,
      isPublicWebmail: false,
      isBusinessDomain: false,
      isValid: false,
      error: "Please enter a valid email address format.",
    };
  }

  const { domain, email: normalizedEmail } = norm;

  // 1. Check if domain is in the legitimate public provider allowlist
  if (LEGITIMATE_PUBLIC_PROVIDERS.has(domain)) {
    return {
      normalizedEmail,
      normalizedDomain: domain,
      providerType: "PUBLIC_WEBMAIL",
      isDisposable: false,
      isPublicWebmail: true,
      isBusinessDomain: false,
      isValid: true,
    };
  }

  // 2. Check built-in disposable list
  let isDisposable = BUILTIN_DISPOSABLE_DOMAINS.has(domain);

  // Check subdomains (e.g. *.mailinator.com, *.yopmail.com)
  if (!isDisposable) {
    for (const disp of BUILTIN_DISPOSABLE_DOMAINS) {
      if (domain.endsWith(`.${disp}`)) {
        isDisposable = true;
        break;
      }
    }
  }

  // 3. Check dynamically configured custom disposable domains from AppSetting
  if (!isDisposable) {
    try {
      const customBlocked = await getSetting("disposable_email_domains_custom");
      if (customBlocked) {
        const customList = customBlocked
          .split(/[\n,;]/)
          .map((d) => d.trim().toLowerCase())
          .filter(Boolean);

        for (const customDomain of customList) {
          if (domain === customDomain || domain.endsWith(`.${customDomain}`)) {
            isDisposable = true;
            break;
          }
        }
      }
    } catch {
      // Non-fatal if AppSetting lookup fails
    }
  }

  if (isDisposable) {
    return {
      normalizedEmail,
      normalizedDomain: domain,
      providerType: "DISPOSABLE",
      isDisposable: true,
      isPublicWebmail: false,
      isBusinessDomain: false,
      isValid: false,
      error: "Temporary or disposable email addresses are not permitted. Please use a permanent personal or business email address.",
    };
  }

  // 4. If not public webmail and not disposable, it is a custom / business domain
  return {
    normalizedEmail,
    normalizedDomain: domain,
    providerType: "BUSINESS_DOMAIN",
    isDisposable: false,
    isPublicWebmail: false,
    isBusinessDomain: true,
    isValid: true,
  };
}

export function normalizeEmailDomain(input: string): string {
  const norm = normalizeEmail(input.includes("@") ? input : `test@${input}`);
  return norm ? norm.domain : input.trim().toLowerCase();
}

export function isDisposableEmail(emailOrDomain: string): boolean {
  const domain = normalizeEmailDomain(emailOrDomain);
  if (LEGITIMATE_PUBLIC_PROVIDERS.has(domain)) return false;
  if (BUILTIN_DISPOSABLE_DOMAINS.has(domain)) return true;
  for (const disp of BUILTIN_DISPOSABLE_DOMAINS) {
    if (domain.endsWith(`.${disp}`)) return true;
  }
  return false;
}

export function classifyEmailDomain(emailOrDomain: string): EmailProviderType {
  const domain = normalizeEmailDomain(emailOrDomain);
  if (!domain || !domain.includes(".")) return "INVALID";
  if (LEGITIMATE_PUBLIC_PROVIDERS.has(domain)) return "PUBLIC_WEBMAIL";
  if (isDisposableEmail(domain)) return "DISPOSABLE";
  return "BUSINESS_DOMAIN";
}

