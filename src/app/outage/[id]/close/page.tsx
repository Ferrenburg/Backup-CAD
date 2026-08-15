"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useBoardContext } from "@/components/board/board-context";
import { closeOutageAction, markRestoredAction, type CloseOutageInput } from "../outage-actions";

function nowLocalInputValue() {
  const d = new Date();
  d.setSeconds(0, 0);
  const tzOffset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
}

export default function ClosePage() {
  const { outage, calls, profile } = useBoardContext();
  const router = useRouter();
  const unentered = useMemo(() => calls.filter((c) => !c.entered_into_cad), [calls]);

  const [restoredAt, setRestoredAt] = useState(nowLocalInputValue());
  const [confirmedBy, setConfirmedBy] = useState(profile.full_name);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const [restoreBusy, setRestoreBusy] = useState(false);

  const [beStarted, setBeStarted] = useState("");
  const [beCompleted, setBeCompleted] = useState("");
  const [performedBy, setPerformedBy] = useState("");
  const [verifiedBy, setVerifiedBy] = useState("");
  const [gapsFound, setGapsFound] = useState(false);
  const [aarRequired, setAarRequired] = useState(false);
  const [notes, setNotes] = useState(outage.notes ?? "");
  const [overrideReason, setOverrideReason] = useState("");
  const [closeError, setCloseError] = useState<string | null>(null);
  const [closeBusy, setCloseBusy] = useState(false);

  if (outage.status === "closed") {
    return (
      <div className="mx-auto max-w-2xl px-6 py-6">
        <h1 className="text-lg font-semibold text-fg">Outage closed</h1>
        <p className="mt-2 text-sm text-fg-muted">
          {outage.event_number} was closed with last call number {outage.last_call_number_issued ?? "—"}.
        </p>
      </div>
    );
  }

  async function handleClose(e: React.FormEvent) {
    e.preventDefault();
    setCloseBusy(true);
    setCloseError(null);
    const input: CloseOutageInput = {
      cad_restored_at: outage.cad_restored_at ?? new Date(restoredAt).toISOString(),
      restoration_confirmed_by: outage.restoration_confirmed_by ?? confirmedBy,
      back_entry_started_at: beStarted ? new Date(beStarted).toISOString() : null,
      back_entry_completed_at: beCompleted ? new Date(beCompleted).toISOString() : null,
      back_entry_performed_by: performedBy || null,
      back_entry_verified_by: verifiedBy || null,
      gaps_found: gapsFound,
      aar_required: aarRequired,
      notes: notes || null,
      overrideReason: overrideReason || null,
    };
    const result = await closeOutageAction(outage.id, input);
    setCloseBusy(false);
    if (result.error) {
      setCloseError(result.error);
    } else {
      router.push(`/outage/${outage.id}/report`);
      router.refresh();
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-6">
      <h1 className="text-lg font-semibold text-fg">Close outage {outage.event_number}</h1>

      {outage.status === "open" ? (
        <div className="mt-4 rounded border border-border bg-surface p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-fg-muted">
            Step 1 — confirm CAD restoration
          </h2>
          <div className="mt-2 grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs text-fg-muted">CAD restored at</label>
              <input
                type="datetime-local"
                value={restoredAt}
                onChange={(e) => setRestoredAt(e.target.value)}
                className="w-full rounded border border-border-strong bg-surface-raised px-2 py-1.5 font-mono-nums text-fg outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-fg-muted">Confirmed by</label>
              <input
                value={confirmedBy}
                onChange={(e) => setConfirmedBy(e.target.value)}
                className="w-full rounded border border-border-strong bg-surface-raised px-2 py-1.5 text-fg outline-none"
              />
            </div>
          </div>
          {restoreError ? <p className="mt-2 text-sm text-danger">{restoreError}</p> : null}
          <button
            type="button"
            disabled={restoreBusy}
            onClick={async () => {
              setRestoreBusy(true);
              const result = await markRestoredAction(outage.id, new Date(restoredAt).toISOString(), confirmedBy);
              setRestoreBusy(false);
              if (result.error) setRestoreError(result.error);
              else router.refresh();
            }}
            className="mt-3 rounded bg-accent px-3 py-2 text-sm font-semibold text-accent-fg disabled:opacity-60"
          >
            Mark CAD restored
          </button>
        </div>
      ) : (
        <form onSubmit={handleClose} className="mt-4 space-y-4 rounded border border-border bg-surface p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-fg-muted">
            Step 2 — back-entry and closeout
          </h2>

          {unentered.length > 0 ? (
            <p className="rounded border border-warn/40 bg-warn/10 px-3 py-2 text-sm text-warn">
              {unentered.length} call(s) are not yet entered into CAD. Closing requires a written
              override reason below, or finish reconciliation first.
            </p>
          ) : (
            <p className="text-sm text-ok">All calls are entered into CAD.</p>
          )}

          <div className="grid grid-cols-2 gap-3">
            <DateTimeField label="Back-entry started" value={beStarted} onChange={setBeStarted} />
            <DateTimeField label="Back-entry completed" value={beCompleted} onChange={setBeCompleted} />
            <TextField label="Back-entry performed by" value={performedBy} onChange={setPerformedBy} />
            <TextField label="Back-entry verified by" value={verifiedBy} onChange={setVerifiedBy} />
          </div>

          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm text-fg-muted">
              <input type="checkbox" checked={gapsFound} onChange={(e) => setGapsFound(e.target.checked)} />
              Gaps found in the record
            </label>
            <label className="flex items-center gap-2 text-sm text-fg-muted">
              <input type="checkbox" checked={aarRequired} onChange={(e) => setAarRequired(e.target.checked)} />
              After-action review required
            </label>
          </div>

          <div>
            <label className="mb-1 block text-sm text-fg-muted">Closeout notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full rounded border border-border-strong bg-surface-raised px-3 py-2 text-fg outline-none"
            />
          </div>

          {unentered.length > 0 ? (
            <div>
              <label className="mb-1 block text-sm text-danger">Override reason (required)</label>
              <textarea
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                rows={2}
                className="w-full rounded border border-danger/50 bg-surface-raised px-3 py-2 text-fg outline-none"
              />
            </div>
          ) : null}

          {closeError ? <p className="text-sm text-danger">{closeError}</p> : null}

          <button
            type="submit"
            disabled={closeBusy}
            className="w-full rounded bg-danger px-3 py-2 font-semibold text-white disabled:opacity-60"
          >
            {closeBusy ? "Closing…" : "Close outage"}
          </button>
        </form>
      )}
    </div>
  );
}

function TextField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="mb-1 block text-xs text-fg-muted">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded border border-border-strong bg-surface-raised px-2 py-1.5 text-fg outline-none"
      />
    </div>
  );
}

function DateTimeField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="mb-1 block text-xs text-fg-muted">{label}</label>
      <input
        type="datetime-local"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded border border-border-strong bg-surface-raised px-2 py-1.5 font-mono-nums text-fg outline-none"
      />
    </div>
  );
}
