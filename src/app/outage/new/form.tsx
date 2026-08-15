"use client";

import { useState, useTransition } from "react";
import { declareOutageAction, type DeclareOutageState } from "./actions";

function nowLocalInputValue() {
  const d = new Date();
  d.setSeconds(0, 0);
  const tzOffset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
}

export function DeclareOutageForm({
  suggestedEventNumber,
  detectedByDefault,
}: {
  suggestedEventNumber: string;
  detectedByDefault: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result: DeclareOutageState = await declareOutageAction({ error: null }, formData);
      if (result.error) setError(result.error);
    });
  }

  return (
    <form action={handleSubmit} className="mt-6 space-y-4 rounded-lg border border-border bg-surface p-6">
      <Field label="Event number">
        <input
          name="event_number"
          defaultValue={suggestedEventNumber}
          required
          className="input font-mono-nums"
        />
      </Field>

      <Field label="CAD failure detected at">
        <input
          type="datetime-local"
          name="failure_detected_at"
          defaultValue={nowLocalInputValue()}
          required
          className="input font-mono-nums"
        />
      </Field>

      <Field label="Detected by">
        <input name="detected_by" defaultValue={detectedByDefault} required className="input" />
      </Field>

      <Field label="Nature of failure">
        <textarea name="failure_nature" rows={2} className="input" placeholder="e.g. CAD application server unresponsive, vendor confirmed outage" />
      </Field>

      <Field label="Systems still operational">
        <textarea
          name="systems_still_operational"
          rows={2}
          className="input"
          placeholder="e.g. phones up, radio up, ANI/ALI down, mobile data down"
        />
      </Field>

      <label className="flex items-center gap-2 text-sm text-fg-muted">
        <input type="checkbox" name="paper_forms_used" className="h-4 w-4" />
        Paper call cards are also being used as a fallback
      </label>

      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded bg-accent px-3 py-2 font-semibold text-accent-fg disabled:opacity-60"
      >
        {isPending ? "Declaring…" : "Declare outage and open the board"}
      </button>

      <style jsx>{`
        .input {
          width: 100%;
          border-radius: 0.25rem;
          border: 1px solid var(--border-strong);
          background: var(--surface-raised);
          color: var(--fg);
          padding: 0.5rem 0.75rem;
          outline: none;
        }
        .input:focus-visible {
          outline: 2px solid var(--focus-ring);
        }
        label {
          display: block;
          margin-bottom: 0.25rem;
          font-size: 0.875rem;
          color: var(--fg-muted);
        }
      `}</style>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label>{label}</label>
      {children}
    </div>
  );
}
