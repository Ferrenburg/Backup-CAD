"use client";

import { useState } from "react";
import { appendNarrativeAction } from "@/app/outage/[id]/calls-actions";
import { formatDateTime } from "@/lib/time";
import type { NarrativeEntry } from "@/lib/types";

export function CallNarrative({
  outageId,
  callId,
  entries,
  disabled,
}: {
  outageId: string;
  callId: string;
  entries: NarrativeEntry[];
  disabled: boolean;
}) {
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleAdd() {
    if (!text.trim()) return;
    setSubmitting(true);
    await appendNarrativeAction(outageId, callId, text);
    setSubmitting(false);
    setText("");
  }

  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-fg-muted">Narrative</h3>
      <p className="mb-2 text-xs text-fg-dim">
        Append-only. Chief complaint only — no diagnoses, medications, or patient history, and
        no NCIC/TCIC/TLETS or criminal history data. Corrections are made by appending a
        correction entry, not by editing prior entries.
      </p>
      <div className="max-h-64 space-y-2 overflow-y-auto rounded border border-border bg-surface p-3">
        {entries.length === 0 ? (
          <p className="text-sm text-fg-dim">No narrative entries yet.</p>
        ) : (
          entries.map((entry, i) => (
            <div key={i} className="text-sm">
              <div className="font-mono-nums text-xs text-fg-dim">
                {formatDateTime(entry.at)} — {entry.author}
              </div>
              <div className="text-fg">{entry.text}</div>
            </div>
          ))
        )}
      </div>
      {!disabled ? (
        <div className="mt-2 flex gap-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                handleAdd();
              }
            }}
            placeholder="Add narrative entry — chief complaint only, no CJI/PHI. (⌘/Ctrl+Enter to add)"
            rows={2}
            className="flex-1 rounded border border-border-strong bg-surface-raised px-3 py-2 text-sm text-fg outline-none focus-visible:outline-accent"
          />
          <button
            type="button"
            onClick={handleAdd}
            disabled={submitting || !text.trim()}
            className="self-end rounded bg-accent px-3 py-2 text-sm font-semibold text-accent-fg disabled:opacity-60"
          >
            Add
          </button>
        </div>
      ) : null}
    </div>
  );
}
