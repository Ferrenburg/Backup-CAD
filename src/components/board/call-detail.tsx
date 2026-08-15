"use client";

import { useState } from "react";
import { useBoardContext } from "./board-context";
import { Combobox } from "@/components/ui/combobox";
import { TimeStampButton } from "@/components/ui/time-stamp-button";
import { CallNarrative } from "./call-narrative";
import { CallUnits } from "./call-units";
import {
  setCallStatusAction,
  stampCallTimeAction,
  updateCallFieldsAction,
  voidCallAction,
  type CallTimeField,
} from "@/app/outage/[id]/calls-actions";
import { computeCallDurations, formatClock } from "@/lib/time";
import { canSupervise } from "@/lib/roles";
import type { NarrativeEntry } from "@/lib/types";

export function CallDetail({ callId }: { callId: string }) {
  const { outage, calls, unitsForCall, profile, lookupsByCategory } = useBoardContext();
  const call = calls.find((c) => c.id === callId);
  const [voidReason, setVoidReason] = useState("");
  const [voidOpen, setVoidOpen] = useState(false);
  const [voidError, setVoidError] = useState<string | null>(null);

  if (!call) {
    return (
      <div className="px-6 py-6 text-fg-muted">
        Call not found in this outage, or it hasn&apos;t synced yet.
      </div>
    );
  }

  const locked = call.status === "voided" || outage.status === "closed";
  const durations = computeCallDurations(call);

  function patch(field: string, v: string | boolean | null) {
    void updateCallFieldsAction(outage.id, call!.id, { [field]: v });
  }

  function stamp(field: CallTimeField) {
    void stampCallTimeAction(outage.id, call!.id, field);
  }
  function manual(field: CallTimeField, iso: string) {
    void stampCallTimeAction(outage.id, call!.id, field, iso);
  }

  async function handleVoid() {
    if (!voidReason.trim()) {
      setVoidError("A reason is required.");
      return;
    }
    const result = await voidCallAction(outage.id, call!.id, voidReason);
    if (result.error) {
      setVoidError(result.error);
      return;
    }
    setVoidOpen(false);
  }

  const opt = (cat: string) =>
    (lookupsByCategory[cat as keyof typeof lookupsByCategory] ?? []).map((l) => ({
      value: l.value,
      label: l.value,
    }));

  return (
    <div className="mx-auto max-w-3xl px-6 py-6">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <div className="font-mono-nums text-2xl font-bold text-fg">{call.call_number}</div>
          <div className="mt-1 flex items-center gap-2 text-sm text-fg-muted">
            <span>Received {formatClock(call.received_at)}</span>
            {call.voided ? <span className="font-semibold text-danger">VOIDED — {call.void_reason}</span> : null}
          </div>
        </div>
        <div className="flex gap-2">
          {call.status === "active" && !locked ? (
            <button
              type="button"
              onClick={() => setCallStatusAction(outage.id, call.id, "cleared")}
              className="rounded border border-border-strong px-3 py-1.5 text-sm text-fg-muted hover:text-fg"
            >
              Mark cleared
            </button>
          ) : null}
          {canSupervise(profile.role, profile.active) && !call.voided ? (
            <button
              type="button"
              onClick={() => setVoidOpen((v) => !v)}
              className="rounded border border-danger/50 px-3 py-1.5 text-sm text-danger"
            >
              Void
            </button>
          ) : null}
        </div>
      </div>

      {voidOpen ? (
        <div className="mb-4 rounded border border-danger/40 bg-danger/10 p-3">
          <label className="mb-1 block text-sm text-fg">Void reason (required, permanent, audited)</label>
          <textarea
            value={voidReason}
            onChange={(e) => setVoidReason(e.target.value)}
            rows={2}
            className="w-full rounded border border-border-strong bg-surface-raised px-3 py-2 text-sm text-fg outline-none"
          />
          {voidError ? <p className="mt-1 text-sm text-danger">{voidError}</p> : null}
          <div className="mt-2 flex gap-2">
            <button type="button" onClick={handleVoid} className="rounded bg-danger px-3 py-1.5 text-sm font-semibold text-white">
              Confirm void
            </button>
            <button type="button" onClick={() => setVoidOpen(false)} className="rounded border border-border-strong px-3 py-1.5 text-sm text-fg-muted">
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      <section className="mb-6">
        <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-fg-muted">Timestamps</h3>
        <div className="grid grid-cols-2 gap-2">
          <TimeStampButton label="Dispatched" value={call.dispatched_at} anchorIso={call.received_at} onStamp={() => stamp("dispatched_at")} onManualSet={(iso) => manual("dispatched_at", iso)} disabled={locked} shortcutHint="D" />
          <TimeStampButton label="First enroute" value={call.first_enroute_at} anchorIso={call.received_at} onStamp={() => stamp("first_enroute_at")} onManualSet={(iso) => manual("first_enroute_at", iso)} disabled={locked} shortcutHint="E" />
          <TimeStampButton label="First on scene" value={call.first_on_scene_at} anchorIso={call.received_at} onStamp={() => stamp("first_on_scene_at")} onManualSet={(iso) => manual("first_on_scene_at", iso)} disabled={locked} shortcutHint="O" />
          <TimeStampButton label="Last cleared" value={call.last_cleared_at} anchorIso={call.received_at} onStamp={() => stamp("last_cleared_at")} onManualSet={(iso) => manual("last_cleared_at", iso)} disabled={locked} shortcutHint="C" />
        </div>
        <div className="mt-2 flex gap-4 text-xs text-fg-dim">
          <span>Dispatch delay: {formatDuration(durations.dispatchDelaySeconds)}</span>
          <span>Response: {formatDuration(durations.responseSeconds)}</span>
          <span>Total: {formatDuration(durations.totalSeconds)}</span>
        </div>
      </section>

      <section className="mb-6 grid grid-cols-2 gap-4">
        <Combobox label="Call source" value={call.call_source} onChange={(v) => patch("call_source", v)} options={opt("call_source")} />
        <Combobox label="Activity type" value={call.activity_type} onChange={(v) => patch("activity_type", v)} options={opt("activity_type")} />
        <Combobox label="Priority" value={call.priority} onChange={(v) => patch("priority", v)} options={opt("priority")} />
        <Combobox label="Call type" value={call.call_type} onChange={(v) => patch("call_type", v)} options={opt("call_type")} />
        <Combobox label="Agency responding" value={call.agency_responding} onChange={(v) => patch("agency_responding", v)} options={opt("agency")} />
        <Combobox label="Jurisdiction" value={call.jurisdiction} onChange={(v) => patch("jurisdiction", v)} options={opt("jurisdiction")} />
      </section>

      <section className="mb-6 grid grid-cols-3 gap-4">
        <TextField label="Location / address" value={call.location_address} onBlurSave={(v) => patch("location_address", v)} disabled={locked} />
        <TextField label="Apt / unit" value={call.location_apt} onBlurSave={(v) => patch("location_apt", v)} disabled={locked} />
        <TextField label="Cross street" value={call.cross_street} onBlurSave={(v) => patch("cross_street", v)} disabled={locked} />
        <TextField label="Caller name" value={call.caller_name} onBlurSave={(v) => patch("caller_name", v)} disabled={locked} />
        <TextField label="Caller phone" value={call.caller_phone} onBlurSave={(v) => patch("caller_phone", v)} disabled={locked} />
        <TextField label="Caller location" value={call.caller_location} onBlurSave={(v) => patch("caller_location", v)} disabled={locked} />
      </section>

      <section className="mb-6">
        <CallNarrative
          outageId={outage.id}
          callId={call.id}
          entries={(call.narrative as unknown as NarrativeEntry[]) ?? []}
          disabled={locked}
        />
      </section>

      <section className="mb-6">
        <CallUnits
          outageId={outage.id}
          callId={call.id}
          receivedAt={call.received_at}
          assignments={unitsForCall(call.id)}
          disabled={locked}
        />
      </section>

      <section className="mb-6 grid grid-cols-2 gap-4">
        <Combobox label="Disposition" value={call.disposition} onChange={(v) => patch("disposition", v)} options={opt("disposition")} />
        <div>
          <label className="mb-1 block text-sm text-fg-muted">EMS transport</label>
          <select
            value={call.ems_transport ?? ""}
            onChange={(e) => patch("ems_transport", e.target.value || null)}
            disabled={locked}
            className="w-full rounded border border-border-strong bg-surface-raised px-3 py-2 text-fg outline-none disabled:opacity-60"
          >
            <option value="">Not reported</option>
            <option value="Y">Y</option>
            <option value="N">N</option>
            <option value="N/A">N/A</option>
          </select>
        </div>
        <TextField label="Case number" value={call.case_number} onBlurSave={(v) => patch("case_number", v)} disabled={locked} />
        <TextField label="NFIRS number" value={call.nfirs_number} onBlurSave={(v) => patch("nfirs_number", v)} disabled={locked} />
        <TextField label="Destination facility" value={call.destination_facility} onBlurSave={(v) => patch("destination_facility", v)} disabled={locked} />
        <label className="flex items-center gap-2 self-end text-sm text-fg-muted">
          <input
            type="checkbox"
            checked={call.report_taken ?? false}
            onChange={(e) => patch("report_taken", e.target.checked)}
            disabled={locked}
          />
          Report taken
        </label>
      </section>

      {call.entered_into_cad ? (
        <p className="text-xs text-ok">
          Reconciled into CAD as {call.cad_call_number ?? "—"}.
        </p>
      ) : (
        <p className="text-xs text-fg-dim">Not yet reconciled into CAD.</p>
      )}
    </div>
  );
}

function formatDuration(seconds: number | null): string {
  if (seconds === null) return "—";
  const m = Math.floor(Math.abs(seconds) / 60);
  const s = Math.abs(seconds) % 60;
  return `${seconds < 0 ? "-" : ""}${m}m ${s}s`;
}

function TextField({
  label,
  value,
  onBlurSave,
  disabled,
}: {
  label: string;
  value: string | null;
  onBlurSave: (v: string) => void;
  disabled: boolean;
}) {
  const [local, setLocal] = useState(value ?? "");
  return (
    <div>
      <label className="mb-1 block text-sm text-fg-muted">{label}</label>
      <input
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        onBlur={() => onBlurSave(local)}
        disabled={disabled}
        className="w-full rounded border border-border-strong bg-surface-raised px-3 py-2 text-fg outline-none disabled:opacity-60"
      />
    </div>
  );
}
