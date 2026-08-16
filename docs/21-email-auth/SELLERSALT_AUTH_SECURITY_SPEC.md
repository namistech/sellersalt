# SellerSalt — Authentication, Identity & Security Specification

- **Document Version:** 2.0.0
- **Status:** Canonical Specification
- **System Classification:** Multi-Factor Identity, WebAuthn Passkeys & Account Security

---

## 1. Authentication Architecture

SellerSalt supports four verified authentication methods using NextAuth JWT sessions:
1. **Email & Password**: Salted bcrypt password hashing (`User.passwordHash`).
2. **Passkeys (WebAuthn / FIDO2)**: Hardware security keys, Touch ID, Face ID, Windows Hello via `@simplewebauthn` (`WebAuthnCredential` model).
3. **Two-Factor Authentication (TOTP)**: RFC 6238 time-based one-time passwords with client-side QR generation (`qrcode` npm) and encrypted backup codes.
4. **OAuth SSO**: Google OAuth and Etsy Seller OAuth login with automatic email verification.

---

## 2. Mandatory Email Verification & Rate-Capped Reminders

- **Gate Enforcement**: Unverified email/password signups are blocked from the dashboard via `src/app/(dashboard)/layout.tsx` redirecting to `/verify-email`.
- **Capped Reminders**: Managed via `src/lib/email-verification.ts` with a hard limit of 3 verification emails per 24-hour rolling window and a 60-second cooldown between resends.
- **Audit Logging**: All verification attempts and admin-mediated email changes are logged in `AuditLog`.
