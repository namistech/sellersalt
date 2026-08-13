"use client";

import { useState } from "react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    setLoading(false);
    setMessage(data.message ?? "If an account exists for that email, we've sent a reset link.");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mb-1 text-xl font-semibold tracking-tight text-ink">SellerSalt</div>
          <p className="text-sm text-muted">Reset your password</p>
        </div>

        {message ? (
          <div className="card text-center">
            <p className="text-sm text-ink">{message}</p>
            <Link href="/login" className="mt-4 inline-block text-sm font-medium text-accent hover:underline">
              Back to sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="card space-y-4">
            <div>
              <label className="label" htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                required
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? "Sending…" : "Send reset link"}
            </button>
            <p className="text-center text-sm text-muted">
              <Link href="/login" className="text-accent hover:underline">
                Back to sign in
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
