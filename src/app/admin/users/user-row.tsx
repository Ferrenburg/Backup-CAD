"use client";

import { useState, useTransition } from "react";
import { updateProfileAction, resetMfaAction } from "../actions";
import type { Profile, Role } from "@/lib/types";

const ROLES: Role[] = ["readonly", "dispatcher", "supervisor", "admin"];
const AGENCIES = ["", "PD", "Fire", "EMS", "OEM"];

export function UserRow({ profile }: { profile: Profile }) {
  const [role, setRole] = useState<Role>(profile.role as Role);
  const [active, setActive] = useState(profile.active);
  const [agency, setAgency] = useState(profile.agency);
  const [badgeId, setBadgeId] = useState(profile.badge_id ?? "");
  const [mfaExempt, setMfaExempt] = useState(profile.mfa_exempt);
  const [exemptConfirming, setExemptConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [mfaConfirming, setMfaConfirming] = useState(false);
  const [mfaBusy, setMfaBusy] = useState(false);
  const [mfaDone, setMfaDone] = useState(false);
  const [mfaError, setMfaError] = useState<string | null>(null);

  function save(
    patch: Partial<{ role: Role; active: boolean; agency: string; badge_id: string | null; mfa_exempt: boolean }>
  ) {
    startTransition(async () => {
      const result = await updateProfileAction(profile.id, patch);
      if (result.error) setError(result.error);
      else setError(null);
    });
  }

  function requireMfa() {
    setMfaExempt(false);
    save({ mfa_exempt: false });
  }

  function confirmExempt() {
    setMfaExempt(true);
    setExemptConfirming(false);
    save({ mfa_exempt: true });
  }

  async function handleResetMfa() {
    setMfaBusy(true);
    setMfaError(null);
    const result = await resetMfaAction(profile.id);
    setMfaBusy(false);
    setMfaConfirming(false);
    if (result.error) setMfaError(result.error);
    else setMfaDone(true);
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
      <td className="py-2 pr-3">
        <div className="flex flex-col gap-1.5">
          {exemptConfirming ? (
            <span className="flex items-center gap-2">
              <span className="text-xs text-danger">Exempt from MFA?</span>
              <button
                type="button"
                onClick={confirmExempt}
                className="rounded bg-danger px-2 py-0.5 text-xs font-semibold text-white"
              >
                Confirm
              </button>
              <button
                type="button"
                onClick={() => setExemptConfirming(false)}
                className="rounded border border-border-strong px-2 py-0.5 text-xs text-fg-muted"
              >
                Cancel
              </button>
            </span>
          ) : (
            <label className="flex items-center gap-1.5 text-xs text-fg-muted">
              <input
                type="checkbox"
                checked={!mfaExempt}
                onChange={(e) => (e.target.checked ? requireMfa() : setExemptConfirming(true))}
              />
              Require MFA
              {mfaExempt ? <span className="text-danger">(exempt)</span> : null}
            </label>
          )}

          {mfaDone ? (
            <span className="text-xs text-ok">Reset — will re-enroll next login</span>
          ) : mfaConfirming ? (
            <span className="flex items-center gap-2">
              <button
                type="button"
                disabled={mfaBusy}
                onClick={handleResetMfa}
                className="rounded bg-danger px-2 py-1 text-xs font-semibold text-white disabled:opacity-60"
              >
                {mfaBusy ? "Resetting…" : "Confirm reset"}
              </button>
              <button
                type="button"
                onClick={() => setMfaConfirming(false)}
                className="rounded border border-border-strong px-2 py-1 text-xs text-fg-muted"
              >
                Cancel
              </button>
            </span>
          ) : (
            <button
              type="button"
              onClick={() => setMfaConfirming(true)}
              className="w-fit rounded border border-border-strong px-2 py-1 text-xs text-fg-muted hover:text-fg"
              title="Clears their enrolled authenticator so they set up a new one on next login — for a lost or replaced phone."
            >
              Reset MFA
            </button>
          )}
          {mfaError ? <div className="text-xs text-danger">{mfaError}</div> : null}
        </div>
      </td>
      {isPending ? <td className="text-xs text-fg-dim">saving…</td> : null}
      {error ? <td className="text-xs text-danger">{error}</td> : null}
    </tr>
  );
}
