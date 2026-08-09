"use client";

import { useEffect, useState } from "react";

interface Package {
  id: string;
  key: string;
  name: string;
  priceUsd: number;
  isCustom: boolean;
  maxConnectors: number;
  maxSearchConfigs: number;
  maxScheduledSearches: number;
  maxTrackedShops: number;
  maxProspectsPerMonth: number;
  _count: { organizations: number };
}

interface OrgRow {
  id: string;
  name: string;
  ownerEmail: string | null;
  createdAt: string;
  package: Package | null;
  usage: { connectors: number; searchConfigs: number; prospects: number; trackedShops: number };
}

const FIELDS: { key: keyof Package; label: string }[] = [
  { key: "maxConnectors", label: "Connectors" },
  { key: "maxSearchConfigs", label: "Saved searches" },
  { key: "maxScheduledSearches", label: "Scheduled searches" },
  { key: "maxTrackedShops", label: "Tracked shops" },
  { key: "maxProspectsPerMonth", label: "Prospects/month" },
];

export function AdminPackagesClient() {
  const [packages, setPackages] = useState<Package[]>([]);
  const [orgs, setOrgs] = useState<OrgRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Partial<Package>>({});
  const [showNewForm, setShowNewForm] = useState(false);
  const [newPkg, setNewPkg] = useState({
    key: "", name: "", priceUsd: 0, isCustom: true,
    maxConnectors: 1, maxSearchConfigs: 3, maxScheduledSearches: 1, maxTrackedShops: 5, maxProspectsPerMonth: 200,
  });

  async function loadAll() {
    const [pRes, oRes] = await Promise.all([fetch("/api/admin/packages"), fetch("/api/admin/organizations")]);
    const [pData, oData] = await Promise.all([pRes.json(), oRes.json()]);
    setPackages(pData.packages ?? []);
    setOrgs(oData.organizations ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadAll();
  }, []);

  function startEdit(pkg: Package) {
    setEditingId(pkg.id);
    setDraft(pkg);
  }

  async function saveEdit() {
    if (!editingId) return;
    await fetch(`/api/admin/packages/${editingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(draft),
    });
    setEditingId(null);
    loadAll();
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/admin/packages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newPkg),
    });
    setShowNewForm(false);
    setNewPkg({ key: "", name: "", priceUsd: 0, isCustom: true, maxConnectors: 1, maxSearchConfigs: 3, maxScheduledSearches: 1, maxTrackedShops: 5, maxProspectsPerMonth: 200 });
    loadAll();
  }

  async function handleAssign(orgId: string, packageId: string) {
    await fetch(`/api/admin/organizations/${orgId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ packageId }),
    });
    loadAll();
  }

  if (loading) return <p className="text-sm text-muted">Loading…</p>;

  return (
    <div className="space-y-8">
      <div className="card overflow-x-auto">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-ink">Packages</h2>
          <button className="btn-secondary" onClick={() => setShowNewForm((s) => !s)}>
            {showNewForm ? "Cancel" : "New package"}
          </button>
        </div>

        {showNewForm && (
          <form onSubmit={handleCreate} className="mb-4 grid grid-cols-2 gap-3 rounded-md border border-line p-3 sm:grid-cols-4">
            <input className="input" placeholder="key (e.g. STARTER)" value={newPkg.key} onChange={(e) => setNewPkg({ ...newPkg, key: e.target.value })} required />
            <input className="input" placeholder="Display name" value={newPkg.name} onChange={(e) => setNewPkg({ ...newPkg, name: e.target.value })} required />
            <input className="input" type="number" placeholder="Price $" value={newPkg.priceUsd} onChange={(e) => setNewPkg({ ...newPkg, priceUsd: Number(e.target.value) })} />
            <div />
            {FIELDS.map((f) => (
              <input
                key={f.key}
                className="input"
                type="number"
                placeholder={f.label}
                value={(newPkg as any)[f.key]}
                onChange={(e) => setNewPkg({ ...newPkg, [f.key]: Number(e.target.value) })}
              />
            ))}
            <button type="submit" className="btn-primary sm:col-span-4">Create package</button>
          </form>
        )}

        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
              <th className="py-2 pr-4">Package</th>
              <th className="py-2 pr-4">Price</th>
              {FIELDS.map((f) => (
                <th key={f.key} className="py-2 pr-4">{f.label}</th>
              ))}
              <th className="py-2 pr-4">Orgs</th>
              <th className="py-2 pr-4"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {packages.map((pkg) => {
              const isEditing = editingId === pkg.id;
              return (
                <tr key={pkg.id}>
                  <td className="py-2 pr-4 font-medium text-ink">
                    {pkg.name} {pkg.isCustom && <span className="badge bg-accent-soft text-accent">custom</span>}
                  </td>
                  <td className="py-2 pr-4 tabular-nums">
                    {isEditing ? (
                      <input className="input !w-20" type="number" value={draft.priceUsd ?? pkg.priceUsd} onChange={(e) => setDraft({ ...draft, priceUsd: Number(e.target.value) })} />
                    ) : (
                      `$${pkg.priceUsd}`
                    )}
                  </td>
                  {FIELDS.map((f) => (
                    <td key={f.key} className="py-2 pr-4 tabular-nums">
                      {isEditing ? (
                        <input
                          className="input !w-20"
                          type="number"
                          value={(draft as any)[f.key] ?? (pkg as any)[f.key]}
                          onChange={(e) => setDraft({ ...draft, [f.key]: Number(e.target.value) })}
                        />
                      ) : (
                        (pkg as any)[f.key]
                      )}
                    </td>
                  ))}
                  <td className="py-2 pr-4 tabular-nums">{pkg._count.organizations}</td>
                  <td className="py-2 pr-4">
                    {isEditing ? (
                      <div className="flex gap-2">
                        <button onClick={saveEdit} className="text-accent hover:underline">Save</button>
                        <button onClick={() => setEditingId(null)} className="text-muted hover:underline">Cancel</button>
                      </div>
                    ) : (
                      <button onClick={() => startEdit(pkg)} className="text-accent hover:underline">Edit</button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="card overflow-x-auto">
        <h2 className="mb-4 text-sm font-semibold text-ink">Organizations</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
              <th className="py-2 pr-4">Org</th>
              <th className="py-2 pr-4">Owner</th>
              <th className="py-2 pr-4">Package</th>
              <th className="py-2 pr-4">Usage</th>
              <th className="py-2 pr-4">Assign</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {orgs.map((org) => (
              <tr key={org.id}>
                <td className="py-2 pr-4 font-medium text-ink">{org.name}</td>
                <td className="py-2 pr-4 text-muted">{org.ownerEmail ?? "—"}</td>
                <td className="py-2 pr-4">{org.package?.name ?? "None"}</td>
                <td className="py-2 pr-4 text-xs text-muted">
                  {org.usage.connectors}c · {org.usage.searchConfigs}s · {org.usage.trackedShops}t · {org.usage.prospects}p
                </td>
                <td className="py-2 pr-4">
                  <select
                    className="input !w-auto py-1 text-xs"
                    value={org.package?.id ?? ""}
                    onChange={(e) => handleAssign(org.id, e.target.value)}
                  >
                    <option value="" disabled>Select…</option>
                    {packages.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
