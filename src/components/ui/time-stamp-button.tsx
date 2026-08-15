"use client";

import { useState } from "react";
import { formatClock, parseManualTime, resolvedDateLabel } from "@/lib/time";

/**
 * The single most important UI element in this app (§7.3). One click
 * stamps the current time; a small text field beside it accepts manual
 * correction as HHMM or HH:MM, 24-hour, resolved against `anchorIso`
 * (almost always the call's received_at) with midnight-rollover shown.
 */
export function TimeStampButton({
  label,
  value,
  anchorIso,
  onStamp,
  onManualSet,
  disabled,
  shortcutHint,
}: {
  label: string;
  value: string | null;
  anchorIso: string;
  onStamp: () => void;
  onManualSet: (iso: string) => void;
  disabled?: boolean;
  shortcutHint?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [manual, setManual] = useState("");
  const [rolledOver, setRolledOver] = useState(false);
  const [manualError, setManualError] = useState(false);

  function submitManual() {
    const parsed = parseManualTime(manual, anchorIso);
    if (!parsed) {
      setManualError(true);
      return;
    }
    onManualSet(parsed.iso);
    setRolledOver(parsed.rolledOverToNextDay);
    setManualError(false);
    setEditing(false);
    setManual("");
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        disabled={disabled}
        onClick={onStamp}
        className="group flex flex-1 items-center justify-between rounded border border-border-strong bg-surface-raised px-3 py-2 text-left disabled:opacity-50"
        title={shortcutHint ? `Shortcut: ${shortcutHint}` : undefined}
      >
        <span className="text-sm text-fg-muted">{label}</span>
        <span className="font-mono-nums text-lg font-semibold text-fg">
          {value ? formatClock(value) : "tap to stamp"}
        </span>
      </button>

      {editing ? (
        <div className="flex items-center gap-1">
          <input
            autoFocus
            value={manual}
            onChange={(e) => setManual(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submitManual();
              if (e.key === "Escape") {
                setEditing(false);
                setManual("");
              }
            }}
            placeholder="HHMM"
            className="w-20 rounded border border-border-strong bg-surface-raised px-2 py-2 text-center font-mono-nums text-fg outline-none focus-visible:outline-accent"
          />
          <button
            type="button"
            onClick={submitManual}
            className="rounded bg-accent px-2 py-2 text-xs font-semibold text-accent-fg"
          >
            Set
          </button>
        </div>
      ) : (
        <button
          type="button"
          disabled={disabled}
          onClick={() => setEditing(true)}
          className="rounded border border-border px-2 py-2 text-xs text-fg-dim hover:text-fg disabled:opacity-50"
        >
          edit
        </button>
      )}

      {manualError ? <span className="text-xs text-danger">bad time</span> : null}
      {rolledOver ? (
        <span className="text-xs text-warn">{resolvedDateLabel(value ?? anchorIso)} (+1d)</span>
      ) : null}
    </div>
  );
}
