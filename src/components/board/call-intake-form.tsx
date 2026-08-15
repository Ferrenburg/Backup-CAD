"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useBoardContext } from "./board-context";
import { Combobox } from "@/components/ui/combobox";
import { useDraft } from "@/lib/use-draft";
import { createCallAction } from "@/app/outage/[id]/calls-actions";
import { formatClock, parseManualTime, resolvedDateLabel } from "@/lib/time";

interface IntakeDraft {
  received_at: string;
  call_source: string | null;
  activity_type: string | null;
  priority: string | null;
  call_type: string | null;
  agency_responding: string | null;
  jurisdiction: string | null;
  location_address: string;
  location_apt: string;
  cross_street: string;
  caller_name: string;
  caller_phone: string;
  caller_location: string;
}

function blankDraft(): IntakeDraft {
  return {
    received_at: new Date().toISOString(),
    call_source: null,
    activity_type: null,
    priority: null,
    call_type: null,
    agency_responding: null,
    jurisdiction: null,
    location_address: "",
    location_apt: "",
    cross_street: "",
    caller_name: "",
    caller_phone: "",
    caller_location: "",
  };
}

export function CallIntakeForm() {
  const { outage, lookupsByCategory } = useBoardContext();
  const router = useRouter();
  const draftKey = `cad-draft-${outage.id}`;
  const { value, setValue, restoredAvailable, restore, dismissRestore, clearDraft } = useDraft<IntakeDraft>(
    draftKey,
    blankDraft()
  );

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [receivedManual, setReceivedManual] = useState("");
  const [rolledOver, setRolledOver] = useState(false);
  const firstFieldRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    firstFieldRef.current?.focus();
  }, []);

  function set<K extends keyof IntakeDraft>(k: K, v: IntakeDraft[K]) {
    setValue((prev) => ({ ...prev, [k]: v }));
  }

  function opt(category: keyof typeof lookupsByCategory) {
    return (lookupsByCategory[category] ?? []).map((l) => ({ value: l.value, label: l.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!value.call_source || !value.activity_type) {
      setError("Call source and activity type are required.");
      return;
    }
    setSubmitting(true);
    setError(null);
    const result = await createCallAction(outage.id, {
      received_at: value.received_at,
      call_source: value.call_source,
      activity_type: value.activity_type,
      priority: value.priority,
      call_type: value.call_type,
      agency_responding: value.agency_responding,
      jurisdiction: value.jurisdiction,
      location_address: value.location_address || null,
      location_apt: value.location_apt || null,
      cross_street: value.cross_street || null,
      caller_name: value.caller_name || null,
      caller_phone: value.caller_phone || null,
      caller_location: value.caller_location || null,
    });
    setSubmitting(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    clearDraft();
    router.push(`/outage/${outage.id}/call/${result.id}`);
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-6">
      <h1 className="text-lg font-semibold text-fg">New call</h1>

      {restoredAvailable ? (
        <div className="mt-3 flex items-center justify-between rounded border border-warn/40 bg-warn/10 px-3 py-2 text-sm">
          <span className="text-fg">An in-progress call draft was found. Restore it?</span>
          <div className="flex gap-2">
            <button type="button" onClick={restore} className="rounded bg-warn px-2 py-1 text-xs font-semibold text-black">
              Restore
            </button>
            <button type="button" onClick={dismissRestore} className="rounded border border-border-strong px-2 py-1 text-xs text-fg-muted">
              Discard
            </button>
          </div>
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm text-fg-muted">Received at</label>
            <div className="flex items-center gap-2">
              <span className="font-mono-nums flex-1 rounded border border-border-strong bg-surface-raised px-3 py-2 text-lg font-semibold text-fg">
                {formatClock(value.received_at)}
              </span>
              <input
                value={receivedManual}
                onChange={(e) => setReceivedManual(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key !== "Enter") return;
                  const parsed = parseManualTime(receivedManual, value.received_at);
                  if (parsed) {
                    set("received_at", parsed.iso);
                    setRolledOver(parsed.rolledOverToNextDay);
                    setReceivedManual("");
                  }
                }}
                placeholder="HHMM"
                className="w-20 rounded border border-border-strong bg-surface-raised px-2 py-2 text-center font-mono-nums text-fg outline-none"
              />
            </div>
            {rolledOver ? (
              <p className="mt-1 text-xs text-warn">{resolvedDateLabel(value.received_at)} (+1d)</p>
            ) : null}
          </div>

          <Combobox
            label="Call source *"
            value={value.call_source}
            onChange={(v) => set("call_source", v)}
            options={opt("call_source")}
            inputRef={firstFieldRef}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Combobox
            label="Activity type *"
            value={value.activity_type}
            onChange={(v) => set("activity_type", v)}
            options={opt("activity_type")}
          />
          <Combobox
            label="Priority"
            value={value.priority}
            onChange={(v) => set("priority", v)}
            options={opt("priority")}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Combobox
            label="Call type"
            value={value.call_type}
            onChange={(v) => set("call_type", v)}
            options={opt("call_type")}
          />
          <Combobox
            label="Agency responding"
            value={value.agency_responding}
            onChange={(v) => set("agency_responding", v)}
            options={opt("agency")}
          />
        </div>

        <Combobox
            label="Jurisdiction"
            value={value.jurisdiction}
            onChange={(v) => set("jurisdiction", v)}
            options={opt("jurisdiction")}
          />

        <div className="grid grid-cols-3 gap-4">
          <TextField label="Location / address" value={value.location_address} onChange={(v) => set("location_address", v)} />
          <TextField label="Apt / unit" value={value.location_apt} onChange={(v) => set("location_apt", v)} />
          <TextField label="Cross street" value={value.cross_street} onChange={(v) => set("cross_street", v)} />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <TextField label="Caller name" value={value.caller_name} onChange={(v) => set("caller_name", v)} />
          <TextField label="Caller phone" value={value.caller_phone} onChange={(v) => set("caller_phone", v)} />
          <TextField label="Caller location" value={value.caller_location} onChange={(v) => set("caller_location", v)} />
        </div>

        {error ? (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        ) : null}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={submitting}
            className="rounded bg-accent px-4 py-2 font-semibold text-accent-fg disabled:opacity-60"
          >
            {submitting ? "Logging…" : "Log call"}
          </button>
          <button
            type="button"
            onClick={() => router.push(`/outage/${outage.id}`)}
            className="rounded border border-border-strong px-4 py-2 text-fg-muted"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm text-fg-muted">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded border border-border-strong bg-surface-raised px-3 py-2 text-fg outline-none focus-visible:outline-accent"
      />
    </div>
  );
}
