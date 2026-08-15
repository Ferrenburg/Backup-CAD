"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { setUnitActiveAction, upsertUnitAction } from "../actions";
import type { Unit } from "@/lib/types";

export function UnitsTable({ units }: { units: Unit[] }) {
  const router = useRouter();
  const [newId, setNewId] = useState("");
  const [newAgency, setNewAgency] = useState("PD");
  const [newType, setNewType] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleAdd() {
    const result = await upsertUnitAction(newId, newAgency, newType || null, units.length + 1);
    if (result.error) setError(result.error);
    else {
      setNewId("");
      setNewType("");
      setError(null);
      router.refresh();
    }
  }

  return (
    <div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-fg-dim">
            <th className="py-2 pr-3">ID</th>
            <th className="py-2 pr-3">Agency</th>
            <th className="py-2 pr-3">Type</th>
            <th className="py-2 pr-3">Order</th>
            <th className="py-2 pr-3">Active</th>
          </tr>
        </thead>
        <tbody>
          {units.map((u) => (
            <tr key={u.id} className="border-b border-border">
              <td className="py-2 pr-3 font-mono-nums text-fg">{u.id}</td>
              <td className="py-2 pr-3 text-fg-muted">{u.agency}</td>
              <td className="py-2 pr-3 text-fg-muted">{u.unit_type ?? "—"}</td>
              <td className="py-2 pr-3 text-fg-muted">{u.sort_order}</td>
              <td className="py-2 pr-3">
                <input
                  type="checkbox"
                  checked={u.active}
                  onChange={async (e) => {
                    await setUnitActiveAction(u.id, e.target.checked);
                    router.refresh();
                  }}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-4 flex items-end gap-2 rounded border border-border bg-surface p-3">
        <div>
          <label className="mb-1 block text-xs text-fg-muted">New unit ID</label>
          <input value={newId} onChange={(e) => setNewId(e.target.value)} className="rounded border border-border-strong bg-surface-raised px-2 py-1.5 font-mono-nums text-fg" />
        </div>
        <div>
          <label className="mb-1 block text-xs text-fg-muted">Agency</label>
          <select value={newAgency} onChange={(e) => setNewAgency(e.target.value)} className="rounded border border-border-strong bg-surface-raised px-2 py-1.5 text-fg">
            <option value="PD">PD</option>
            <option value="FD">FD</option>
            <option value="Fire">Fire</option>
            <option value="EMS">EMS</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-fg-muted">Type</label>
          <input value={newType} onChange={(e) => setNewType(e.target.value)} className="rounded border border-border-strong bg-surface-raised px-2 py-1.5 text-fg" />
        </div>
        <button onClick={handleAdd} className="rounded bg-accent px-3 py-1.5 text-sm font-semibold text-accent-fg">
          Add unit
        </button>
      </div>
      {error ? <p className="mt-2 text-sm text-danger">{error}</p> : null}
    </div>
  );
}
