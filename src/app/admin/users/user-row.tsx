"use client";

import { useState, useTransition } from "react";
import { updateProfileAction } from "../actions";
import type { Profile, Role } from "@/lib/types";

const ROLES: Role[] = ["readonly", "dispatcher", "supervisor", "admin"];
const AGENCIES = ["", "PD", "Fire", "EMS", "OEM"];

export function UserRow({ profile }: { profile: Profile }) {
  const [role, setRole] = useState<Role>(profile.role as Role);
  const [active, setActive] = useState(profile.active);
  const [agency, setAgency] = useState(profile.agency);
  const [badgeId, setBadgeId] = useState(profile.badge_id ?? "");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function save(patch: Partial<{ role: Role; active: boolean; agency: string; badge_id: string | null }>) {
    startTransition(async () => {
      const result = await updateProfileAction(profile.id, patch);
      if (result.error) setError(result.error);
      else setError(null);
    });
  }

  return (
    <tr className="border-b border-border">
      <td className="py-2 pr-3 text-fg">{profile.full_name}</td>
      <td className="py-2 pr-3">
        <select
          value={agency}
          onChange={(e) => {
            setAgency(e.target.value);
            save({ agency: e.target.value });
          }}
          className="rounded border border-border-strong bg-surface-raised px-2 py-1 text-fg"
        >
          {AGENCIES.map((a) => (
            <option key={a} value={a}>
              {a || "—"}
            </option>
          ))}
        </select>
      </td>
      <td className="py-2 pr-3">
        <input
          value={badgeId}
          onChange={(e) => setBadgeId(e.target.value)}
          onBlur={() => save({ badge_id: badgeId || null })}
          className="w-20 rounded border border-border-strong bg-surface-raised px-2 py-1 text-fg"
        />
      </td>
      <td className="py-2 pr-3">
        <select
          value={role}
          onChange={(e) => {
            const v = e.target.value as Role;
            setRole(v);
            save({ role: v });
          }}
          className="rounded border border-border-strong bg-surface-raised px-2 py-1 text-fg"
        >
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </td>
      <td className="py-2 pr-3">
        <input
          type="checkbox"
          checked={active}
          onChange={(e) => {
            setActive(e.target.checked);
            save({ active: e.target.checked });
          }}
        />
      </td>
      {isPending ? <td className="text-xs text-fg-dim">saving…</td> : null}
      {error ? <td className="text-xs text-danger">{error}</td> : null}
    </tr>
  );
}
