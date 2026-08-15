"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useBoardContext } from "@/components/board/board-context";
import { markEnteredIntoCadAction, verifyBackEntryAction } from "../calls-actions";
import { formatDateTime } from "@/lib/time";
import { canSupervise } from "@/lib/roles";
import type { Call } from "@/lib/types";

export default function ReconcilePage() {
  const { outage, calls, profile } = useBoardContext();
  const router = useRouter();

  const sorted = useMemo(
    () => [...calls].sort((a, b) => new Date(a.received_at).getTime() - new Date(b.received_at).getTime()),
    [calls]
  );
  const remaining = sorted.filter((c) => !c.entered_into_cad);
  const entered = sorted.filter((c) => c.entered_into_cad);
  const verified = sorted.filter((c) => c.verified_by);

  return (
    <div className="mx-auto max-w-3xl px-6 py-6">
      <h1 className="text-lg font-semibold text-fg">Reconciliation queue</h1>
      <p className="mt-1 text-sm text-fg-muted">
        Back-entry into CAD, oldest call first. Verification must be performed by someone
        other than whoever did the back-entry.
      </p>

      <div className="mt-4 grid grid-cols-4 gap-3">
        <Counter label="Total" value={sorted.length} />
        <Counter label="Entered" value={entered.length} />
        <Counter label="Verified" value={verified.length} />
        <Counter label="Remaining" value={remaining.length} highlight={remaining.length > 0} />
      </div>

      <ul className="mt-6 space-y-3">
        {sorted.map((call) => (
          <ReconcileRow
            key={call.id}
            outageId={outage.id}
            call={call}
            canVerify={canSupervise(profile.role, profile.active)}
            currentUserId={profile.id}
            onChanged={() => router.refresh()}
          />
        ))}
      </ul>
    </div>
  );
}

function Counter({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className="rounded border border-border bg-surface p-3 text-center">
      <div className={`font-mono-nums text-2xl font-bold ${highlight ? "text-warn" : "text-fg"}`}>{value}</div>
      <div className="text-xs uppercase tracking-wide text-fg-dim">{label}</div>
    </div>
  );
}

function ReconcileRow({
  outageId,
  call,
  canVerify,
  currentUserId,
  onChanged,
}: {
  outageId: string;
  call: Call;
  canVerify: boolean;
  currentUserId: string;
  onChanged: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [cadNumber, setCadNumber] = useState(call.cad_call_number ?? "");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const sameActor = call.back_entered_by === currentUserId;

  return (
    <li className="rounded border border-border bg-surface">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <div>
          <span className="font-mono-nums font-semibold text-fg">{call.call_number}</span>
          <span className="ml-3 text-sm text-fg-muted">{formatDateTime(call.received_at)}</span>
          <span className="ml-3 text-sm text-fg-muted">{call.call_type ?? "—"}</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          {call.entered_into_cad ? (
            <span className="rounded bg-ok/20 px-2 py-1 font-semibold text-ok">Entered</span>
          ) : (
            <span className="rounded bg-warn/20 px-2 py-1 font-semibold text-warn">Not entered</span>
          )}
          {call.verified_by ? (
            <span className="rounded bg-ok/20 px-2 py-1 font-semibold text-ok">Verified</span>
          ) : null}
        </div>
      </button>

      {expanded ? (
        <div className="border-t border-border px-4 py-3 text-sm">
          <dl className="grid grid-cols-2 gap-2 text-fg-muted">
            <Field label="Call source" value={call.call_source} />
            <Field label="Activity type" value={call.activity_type} />
            <Field label="Priority" value={call.priority} />
            <Field label="Location" value={call.location_address} />
            <Field label="Disposition" value={call.disposition} />
          </dl>

          {!call.entered_into_cad ? (
            <div className="mt-3 flex items-end gap-2">
              <div className="flex-1">
                <label className="mb-1 block text-xs text-fg-muted">Real CAD call number</label>
                <input
                  value={cadNumber}
                  onChange={(e) => setCadNumber(e.target.value)}
                  className="w-full rounded border border-border-strong bg-surface-raised px-2 py-1.5 font-mono-nums text-fg outline-none"
                />
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  const result = await markEnteredIntoCadAction(outageId, call.id, cadNumber);
                  setBusy(false);
                  if (result.error) setError(result.error);
                  else onChanged();
                }}
                className="rounded bg-accent px-3 py-1.5 text-sm font-semibold text-accent-fg disabled:opacity-60"
              >
                Mark entered
              </button>
            </div>
          ) : !call.verified_by ? (
            <div className="mt-3 flex items-center gap-2">
              <span className="text-xs text-fg-dim">CAD #: {call.cad_call_number}</span>
              {canVerify ? (
                <button
                  type="button"
                  disabled={busy || sameActor}
                  title={sameActor ? "The verifier must differ from whoever performed the back-entry." : undefined}
                  onClick={async () => {
                    setBusy(true);
                    const result = await verifyBackEntryAction(outageId, call.id);
                    setBusy(false);
                    if (result.error) setError(result.error);
                    else onChanged();
                  }}
                  className="rounded bg-accent px-3 py-1.5 text-sm font-semibold text-accent-fg disabled:opacity-60"
                >
                  Verify
                </button>
              ) : (
                <span className="text-xs text-fg-dim">Awaiting supervisor verification</span>
              )}
              {sameActor ? (
                <span className="text-xs text-danger">
                  You performed this back-entry — a different supervisor must verify it.
                </span>
              ) : null}
            </div>
          ) : (
            <p className="mt-3 text-xs text-ok">
              Verified {formatDateTime(call.verified_at)}.
            </p>
          )}

          {error ? <p className="mt-2 text-sm text-danger">{error}</p> : null}
        </div>
      ) : null}
    </li>
  );
}

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-fg-dim">{label}</dt>
      <dd className="text-fg">{value ?? "—"}</dd>
    </div>
  );
}
