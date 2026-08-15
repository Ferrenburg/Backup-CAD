"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { useBoardContext } from "./board-context";
import { formatElapsed } from "@/lib/time";
import type { Call } from "@/lib/types";

const PRIORITY_STYLES: Record<string, string> = {
  "P1 - Life Threat": "bg-p1 text-p1-fg",
  "P2 - Urgent": "bg-p2 text-black",
};

export function CallList({ searchInputRef }: { searchInputRef: React.RefObject<HTMLInputElement | null> }) {
  const { calls, unitsForCall, now, outage } = useBoardContext();
  const pathname = usePathname();
  const [query, setQuery] = useState("");

  const selectedCallId = useMemo(() => {
    const m = pathname.match(/\/call\/([^/]+)/);
    return m ? m[1] : null;
  }, [pathname]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const notVoided = calls.filter((c) => c.status !== "voided" || q);
    if (!q) return notVoided;
    return notVoided.filter((c) =>
      [c.call_number, c.location_address, c.call_type, c.caller_name]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    );
  }, [calls, query]);

  const active = filtered
    .filter((c) => c.status === "active")
    .sort((a, b) => new Date(b.received_at).getTime() - new Date(a.received_at).getTime());
  const cleared = filtered
    .filter((c) => c.status !== "active")
    .sort((a, b) => new Date(b.received_at).getTime() - new Date(a.received_at).getTime());

  const [clearedOpen, setClearedOpen] = useState(false);

  return (
    <div className="flex h-full flex-col">
      <div className="flex-none border-b border-border p-3">
        <input
          ref={searchInputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search calls… ( / )"
          className="w-full rounded border border-border-strong bg-surface-raised px-3 py-1.5 text-sm text-fg outline-none focus-visible:outline-accent"
        />
      </div>

      <div className="flex-1 overflow-y-auto">
        <SectionLabel>Active ({active.length})</SectionLabel>
        {active.length === 0 ? (
          <p className="px-3 py-4 text-sm text-fg-dim">No active calls. Press N to log one.</p>
        ) : (
          active.map((c) => (
            <CallRow
              key={c.id}
              call={c}
              outageId={outage.id}
              selected={c.id === selectedCallId}
              unitCount={unitsForCall(c.id).length}
              now={now}
            />
          ))
        )}

        <button
          type="button"
          onClick={() => setClearedOpen((v) => !v)}
          className="flex w-full items-center justify-between px-3 py-2 text-xs font-semibold uppercase tracking-wide text-fg-dim hover:text-fg-muted"
        >
          <span>Cleared ({cleared.length})</span>
          <span>{clearedOpen ? "▾" : "▸"}</span>
        </button>
        {clearedOpen &&
          cleared.map((c) => (
            <CallRow
              key={c.id}
              call={c}
              outageId={outage.id}
              selected={c.id === selectedCallId}
              unitCount={unitsForCall(c.id).length}
              now={now}
            />
          ))}
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-fg-dim">
      {children}
    </div>
  );
}

function CallRow({
  call,
  outageId,
  selected,
  unitCount,
  now,
}: {
  call: Call;
  outageId: string;
  selected: boolean;
  unitCount: number;
  now: number;
}) {
  const priorityClass = call.priority ? PRIORITY_STYLES[call.priority] : undefined;
  const isP1 = call.priority === "P1 - Life Threat";

  return (
    <Link
      href={`/outage/${outageId}/call/${call.id}`}
      data-call-row={call.id}
      className={`block border-l-4 px-3 py-2.5 ${
        selected ? "bg-surface-raised" : "hover:bg-surface"
      } ${isP1 ? "border-p1" : call.status === "voided" ? "border-transparent opacity-50" : "border-transparent"}`}
    >
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-mono-nums text-xs text-fg-muted">{call.call_number}</span>
        <span
          className={`font-mono-nums text-xl font-bold ${isP1 ? "text-p1" : "text-fg"}`}
        >
          {call.status === "active" ? formatElapsed(call.received_at, now) : formatElapsed(call.received_at, new Date(call.last_cleared_at ?? call.updated_at).getTime())}
        </span>
      </div>
      <div className="mt-0.5 flex items-center gap-2">
        {call.priority ? (
          <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${priorityClass ?? "bg-surface-raised text-fg-muted"}`}>
            {call.priority.split(" - ")[0]}
          </span>
        ) : null}
        <span className="truncate text-sm text-fg">{call.call_type ?? "Call type pending"}</span>
      </div>
      <div className="mt-0.5 flex items-center justify-between text-xs text-fg-dim">
        <span className="truncate">{call.location_address ?? "No location"}</span>
        {unitCount > 0 ? <span className="font-mono-nums">{unitCount} unit{unitCount === 1 ? "" : "s"}</span> : null}
      </div>
      {call.voided ? <div className="mt-0.5 text-xs font-semibold text-danger">VOIDED</div> : null}
    </Link>
  );
}
