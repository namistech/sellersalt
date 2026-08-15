"use client";

import { useState } from "react";
import { Drawer, Button, Input, Select, Alert } from "@/components/ui";
import { SCHEDULE_FREQUENCY_LABELS, type CreateSearchConfigInput, type ScheduleFrequency } from "@/services/searchConfigs";
import { ServiceError } from "@/services/http";
import type { ConnectorSummary } from "@/services/connectors";

export interface NewSearchDrawerProps {
  open: boolean;
  onClose: () => void;
  connectors: ConnectorSummary[];
  onSubmit: (input: CreateSearchConfigInput) => Promise<void>;
}

const DEFAULT_FORM = {
  connectorId: "",
  name: "",
  keywords: "digital planner, crochet pattern PDF, svg bundle",
  minPrice: 10,
  maxPrice: 20,
  minShopAgeMonths: 12,
  maxShopAgeMonths: 24,
  minReviewCount: 20,
  scheduleFrequency: "MANUAL" as ScheduleFrequency,
};

/** The Wave 4 Connect Shop entry point lives only at Settings → Connections
 * (per this task's scope) — this form is unrelated to that: it's a Discover-side
 * search definition against an existing research Connector, never a Connected Shop. */
export function NewSearchDrawer({ open, onClose, connectors, onSubmit }: NewSearchDrawerProps) {
  const [form, setForm] = useState(DEFAULT_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connectorId = form.connectorId || connectors[0]?.id || "";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const keywords = form.keywords.split(",").map((k) => k.trim()).filter(Boolean);
    if (!connectorId || !form.name || keywords.length === 0) {
      setError("Connector, a name, and at least one keyword are required.");
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit({ ...form, connectorId, keywords });
      setForm(DEFAULT_FORM);
    } catch (err) {
      setError(err instanceof ServiceError ? err.message : "Couldn't save this search.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Drawer open={open} onClose={onClose} title="Define a search" description="Runs against your connected marketplace(s).">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Select
          label="Connector"
          required
          value={connectorId}
          onChange={(e) => setForm({ ...form, connectorId: e.target.value })}
          options={connectors.map((c) => ({ value: c.id, label: c.label }))}
        />
        <Input
          label="Search name"
          required
          placeholder="Digital downloads — Q1"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
        <Input
          label="Keywords"
          helpText="Comma separated"
          value={form.keywords}
          onChange={(e) => setForm({ ...form, keywords: e.target.value })}
        />
        <div className="grid grid-cols-2 gap-4">
          <Input label="Min price ($)" type="number" value={form.minPrice} onChange={(e) => setForm({ ...form, minPrice: Number(e.target.value) })} />
          <Input label="Max price ($)" type="number" value={form.maxPrice} onChange={(e) => setForm({ ...form, maxPrice: Number(e.target.value) })} />
          <Input label="Min shop age (mo)" type="number" value={form.minShopAgeMonths} onChange={(e) => setForm({ ...form, minShopAgeMonths: Number(e.target.value) })} />
          <Input label="Max shop age (mo)" type="number" value={form.maxShopAgeMonths} onChange={(e) => setForm({ ...form, maxShopAgeMonths: Number(e.target.value) })} />
        </div>
        <Input label="Min reviews" type="number" value={form.minReviewCount} onChange={(e) => setForm({ ...form, minReviewCount: Number(e.target.value) })} />
        <Select
          label="Run automatically"
          value={form.scheduleFrequency}
          onChange={(e) => setForm({ ...form, scheduleFrequency: e.target.value as ScheduleFrequency })}
          options={Object.entries(SCHEDULE_FREQUENCY_LABELS).map(([value, label]) => ({ value, label }))}
        />

        {error && <Alert variant="danger">{error}</Alert>}
        {connectors.length === 0 && <Alert variant="warning">Connect a marketplace before creating a search.</Alert>}

        <div className="flex gap-2 pt-2">
          <Button type="submit" variant="primary" loading={submitting} disabled={connectors.length === 0} className="bg-[#0E8F5D] hover:bg-[#0C7A52]">
            Save & Run Search →
          </Button>
          <Button type="button" variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
        </div>
      </form>
    </Drawer>
  );
}
