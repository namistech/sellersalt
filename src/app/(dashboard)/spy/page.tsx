"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { SpyTabs } from "./spy-tabs";

export default function SpyOnCompetitorPage() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    const res = await fetch("/api/shops/resolve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });
    const data = await res.json();

    if (!res.ok) {
      setLoading(false);
      setError(data.error ?? "Couldn't process that URL.");
      return;
    }

    setMessage("Your query has been processed, please check after 24 hours.");
    setTimeout(() => {
      router.push(`/shops/${data.shopExternalId}`);
    }, 1200);
  }

  return (
    <div>
      <SpyTabs active="find" />
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="w-full max-w-lg text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-ink">Spy on Competitor</h1>
          <p className="mt-2 text-sm text-muted">
            Paste any Etsy shop URL to pull up its full profile and start tracking its sales over time.
          </p>

          <form onSubmit={handleSubmit} className="card mt-6">
            <label className="label text-left" htmlFor="shopUrl">
              Shop URL
            </label>
            <div className="flex gap-2">
              <input
                id="shopUrl"
                className="input"
                required
                placeholder="https://www.etsy.com/shop/ShopName"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
              <button type="submit" disabled={loading} className="btn-primary shrink-0">
                <Search className="mr-1.5 inline h-4 w-4" />
                {loading ? "Searching…" : "Start spying"}
              </button>
            </div>
            {error && <p className="mt-3 text-left text-sm text-danger">{error}</p>}
            {message && <p className="mt-3 text-left text-sm text-success">{message}</p>}
          </form>
        </div>
      </div>
    </div>
  );
}
