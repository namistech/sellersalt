"use client";

import { useEffect, useState } from "react";
import { Star } from "lucide-react";
import { PageHeader } from "@/components/shell";
import { Card, Alert } from "@/components/ui";
import { Table, EmptyState } from "@/components/data";
import { fetchProspects, updateProspect, type ProspectRow, type ProspectStatus } from "@/services/prospects";
import { ServiceError } from "@/services/http";
import { buildProspectColumns } from "../prospect-columns";

export default function FavoritesPage() {
  const [rows, setRows] = useState<ProspectRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setError(null);
    try {
      setRows(await fetchProspects({ favoriteOnly: true }));
    } catch (e) {
      setError(e instanceof ServiceError ? e.message : "Couldn't load Favorites.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleToggleFavorite(id: string, next: boolean) {
    setRows((prev) => (next ? prev : prev.filter((p) => p.id !== id)));
    try {
      await updateProspect(id, { isFavorite: next });
    } catch {
      load();
    }
  }

  async function handleStatusChange(id: string, status: ProspectStatus) {
    setRows((prev) => prev.map((p) => (p.id === id ? { ...p, status } : p)));
    try {
      await updateProspect(id, { status });
    } catch {
      load();
    }
  }

  const columns = buildProspectColumns({ onToggleFavorite: handleToggleFavorite, onStatusChange: handleStatusChange });

  return (
    <div>
      <PageHeader title="Favorites" description="Prospects you've starred across every search, in one place." />

      {error && (
        <Alert variant="danger" title="Couldn't load Favorites" className="mb-6">
          {error}
        </Alert>
      )}

      <Card padding="sm">
        <Table<ProspectRow>
          aria-label="Favorite prospects"
          columns={columns}
          rows={rows}
          getRowId={(p) => p.id}
          loading={loading}
          emptyState={
            <EmptyState
              icon={<Star />}
              title="No favorites yet"
              description="Star a prospect from the Prospects page to see it here."
            />
          }
        />
      </Card>
    </div>
  );
}
