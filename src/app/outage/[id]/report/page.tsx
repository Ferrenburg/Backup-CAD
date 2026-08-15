"use client";

import { useMemo } from "react";
import { useBoardContext } from "@/components/board/board-context";
import { NOTIFICATION_KEYS, NOTIFICATION_LABELS, type NotificationsLog, type NarrativeEntry } from "@/lib/types";
import { computeCallDurations, formatDateTime } from "@/lib/time";

export default function ReportPage() {
  const { outage, calls, unitsForCall } = useBoardContext();
  const notifications = (outage.notifications ?? {}) as NotificationsLog;

  const sortedCalls = useMemo(
    () => [...calls].sort((a, b) => a.call_number.localeCompare(b.call_number)),
    [calls]
  );

  return (
    <div className="print-page mx-auto max-w-4xl bg-bg px-6 py-6 text-fg">
      <div className="no-print mb-4 flex justify-end">
        <button
          onClick={() => window.print()}
          className="rounded bg-accent px-3 py-1.5 text-sm font-semibold text-accent-fg"
        >
          Print
        </button>
      </div>

      <header className="mb-6 border-b border-border pb-4">
        <h1 className="text-xl font-bold">CAD Downtime Shift Report</h1>
        <p className="font-mono-nums text-lg">{outage.event_number}</p>
        <dl className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
          <ReportField label="Failure detected" value={formatDateTime(outage.failure_detected_at)} />
          <ReportField label="Detected by" value={outage.detected_by} />
          <ReportField label="CAD restored" value={formatDateTime(outage.cad_restored_at)} />
          <ReportField label="Restoration confirmed by" value={outage.restoration_confirmed_by ?? "—"} />
          <ReportField label="Nature of failure" value={outage.failure_nature ?? "—"} />
          <ReportField label="Systems still operational" value={outage.systems_still_operational ?? "—"} />
          <ReportField label="Status" value={outage.status} />
          <ReportField label="Last call number issued" value={outage.last_call_number_issued ?? "—"} />
        </dl>
      </header>

      <section className="mb-6">
        <h2 className="mb-2 text-sm font-bold uppercase tracking-wide">Notification log</h2>
        <table className="w-full text-sm">
          <tbody>
            {NOTIFICATION_KEYS.map((key) => {
              const entry = notifications[key];
              return (
                <tr key={key} className="border-b border-border">
                  <td className="py-1 pr-4">{NOTIFICATION_LABELS[key]}</td>
                  <td className="py-1 pr-4">{entry?.at ? formatDateTime(entry.at) : "Not notified"}</td>
                  <td className="py-1 pr-4">{entry?.by ?? "—"}</td>
                  <td className="py-1">{entry?.method ?? "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-bold uppercase tracking-wide">
          Calls ({sortedCalls.length})
        </h2>
        <div className="space-y-4">
          {sortedCalls.map((call) => {
            const durations = computeCallDurations(call);
            const units = unitsForCall(call.id);
            const narrative = (call.narrative as unknown as NarrativeEntry[]) ?? [];
            return (
              <article key={call.id} className="break-inside-avoid border border-border p-3 text-sm">
                <div className="flex items-baseline justify-between">
                  <span className="font-mono-nums text-base font-bold">{call.call_number}</span>
                  <span className="text-xs">
                    {call.priority ?? "—"} · {call.status.toUpperCase()}
                    {call.voided ? ` · VOID: ${call.void_reason}` : ""}
                  </span>
                </div>
                <div className="mt-1 grid grid-cols-2 gap-x-6 gap-y-0.5 text-xs">
                  <span>Received: {formatDateTime(call.received_at)}</span>
                  <span>Dispatched: {formatDateTime(call.dispatched_at)}</span>
                  <span>First enroute: {formatDateTime(call.first_enroute_at)}</span>
                  <span>First on scene: {formatDateTime(call.first_on_scene_at)}</span>
                  <span>Last cleared: {formatDateTime(call.last_cleared_at)}</span>
                  <span>
                    Dispatch delay: {formatSeconds(durations.dispatchDelaySeconds)} · Response:{" "}
                    {formatSeconds(durations.responseSeconds)} · Total: {formatSeconds(durations.totalSeconds)}
                  </span>
                  <span>Source: {call.call_source}</span>
                  <span>Type: {call.call_type ?? "—"}</span>
                  <span className="col-span-2">
                    Location: {call.location_address ?? "—"} {call.cross_street ? `(x ${call.cross_street})` : ""}
                  </span>
                  <span>Disposition: {call.disposition ?? "—"}</span>
                  <span>CAD #: {call.cad_call_number ?? "not reconciled"}</span>
                </div>

                {units.length > 0 ? (
                  <table className="mt-2 w-full text-xs">
                    <thead>
                      <tr className="text-left text-fg-dim">
                        <th className="pr-2">Unit</th>
                        <th className="pr-2">Disp.</th>
                        <th className="pr-2">Enrt.</th>
                        <th className="pr-2">Scene</th>
                        <th className="pr-2">Clear</th>
                        <th>Disposition</th>
                      </tr>
                    </thead>
                    <tbody>
                      {units.map((u) => (
                        <tr key={u.id}>
                          <td className="pr-2 font-mono-nums">{u.unit_id}</td>
                          <td className="pr-2 font-mono-nums">{formatDateTime(u.dispatched_at)}</td>
                          <td className="pr-2 font-mono-nums">{formatDateTime(u.enroute_at)}</td>
                          <td className="pr-2 font-mono-nums">{formatDateTime(u.on_scene_at)}</td>
                          <td className="pr-2 font-mono-nums">{formatDateTime(u.cleared_at)}</td>
                          <td>{u.unit_disposition ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : null}

                {narrative.length > 0 ? (
                  <div className="mt-2 text-xs">
                    <strong>Narrative:</strong>
                    {narrative.map((n, i) => (
                      <p key={i}>
                        {formatDateTime(n.at)} ({n.author}): {n.text}
                      </p>
                    ))}
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function ReportField({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt className="font-semibold">{label}</dt>
      <dd>{value}</dd>
    </>
  );
}

function formatSeconds(seconds: number | null): string {
  if (seconds === null) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}
