"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { setLookupActiveAction, upsertLookupAction } from "../actions";
import type { Lookup, LookupCategory } from "@/lib/types";

export function LookupsTable({ category, items }: { category: LookupCategory; items: Lookup[] }) {
  const router = useRouter();
  const [newValue, setNewValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleAdd() {
    const result = await upsertLookupAction(category, newValue, items.length + 1);
    if (result.error) setError(result.error);
    else {
      setNewValue("");
      setError(null);
      router.refresh();
    }
  }

  return (
    <div>
      <h2 className="mb-2 font-mono-nums text-sm font-semibold uppercase tracking-wide text-fg-muted">
        {category}
      </h2>
      <table className="w-full text-sm">
        <tbody>
          {items.map((l) => (
            <tr key={l.id} className="border-b border-border">
              <td className="py-1.5 pr-3 text-fg">{l.value}</td>
              <td className="py-1.5 pr-3 text-fg-dim">{l.sort_order}</td>
              <td className="py-1.5 pr-3">
                <input
                  type="checkbox"
                  checked={l.active}
                  onChange={async (e) => {
                    await setLookupActiveAction(l.id, e.target.checked);
                    router.refresh();
                  }}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-2 flex items-center gap-2">
        <input
          value={newValue}
          onChange={(e) => setNewValue(e.target.value)}
          placeholder="New value"
          className="rounded border border-border-strong bg-surface-raised px-2 py-1 text-sm text-fg"
        />
        <button onClick={handleAdd} className="rounded bg-accent px-2 py-1 text-xs font-semibold text-accent-fg">
          Add
        </button>
        {error ? <span className="text-xs text-danger">{error}</span> : null}
      </div>
    </div>
  );
}
