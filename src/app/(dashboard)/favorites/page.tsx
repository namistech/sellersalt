"use client";

import { useEffect, useState } from "react";
import { ProspectTable, type ProspectRow } from "../prospect-table";

export default function FavoritesPage() {
  const [rows, setRows] = useState<ProspectRow[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    const res = await fetch("/api/prospects?favorite=true");
    const data = await res.json();
    setRows(data.prospects ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleToggleFavorite(id: string, next: boolean) {
    setRows((prev) => (next ? prev : prev.filter((p) => p.id !== id)));
    await fetch(`/api/prospects/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isFavorite: next }),
    });
  }

  return (
    <div>
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Favorites</h1>
        <p className="mt-1 text-sm text-muted">
          Prospects you've starred across every search, in one place.
        </p>
      </header>

      <div className="card overflow-x-auto">
        {loading ? (
          <p className="text-sm text-muted">Loading…</p>
        ) : (
          <ProspectTable
            rows={rows}
            onToggleFavorite={handleToggleFavorite}
            emptyMessage='No favorites yet. Star a prospect from the Prospects page to see it here.'
          />
        )}
      </div>
    </div>
  );
}