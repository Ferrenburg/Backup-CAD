import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile, canSupervise } from "@/lib/auth";
import { SignOutButton } from "@/components/sign-out-button";
import { formatDateTime } from "@/lib/time";
import type { AuditLogRow } from "@/lib/types";

const PAGE_SIZE = 50;
const TABLES = ["outages", "calls", "unit_assignments", "profiles"] as const;
const ACTIONS = ["INSERT", "UPDATE", "VOID"] as const;

// Fields noisy or redundant enough in a diff view that they're worth
// hiding by default (updated_at ticks on every write; ids are already the
// record label).
const HIDDEN_DIFF_FIELDS = new Set(["updated_at", "id"]);

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: Promise<{ table?: string; action?: string; actor?: string; page?: string }>;
}) {
  const profile = await getCurrentProfile();
  if (!canSupervise(profile)) {
    return (
      <main className="flex min-h-screen flex-1 items-center justify-center bg-bg px-4">
        <div className="max-w-sm rounded-lg border border-border bg-surface p-6 text-center">
          <h1 className="text-lg font-semibold text-fg">Audit log</h1>
          <p className="mt-2 text-sm text-fg-muted">
            Only supervisors and admins can view the audit log.
          </p>
          <Link href="/" className="mt-4 inline-block text-sm text-accent">
            ← Back
          </Link>
        </div>
      </main>
    );
  }

  const params = await searchParams;
  const table = params.table && (TABLES as readonly string[]).includes(params.table) ? params.table : "";
  const action = params.action && (ACTIONS as readonly string[]).includes(params.action) ? params.action : "";
  const actor = params.actor?.trim() ?? "";
  const page = Math.max(1, Number(params.page) || 1);
  const offset = (page - 1) * PAGE_SIZE;

  const supabase = await createClient();
  let query = supabase
    .from("audit_log")
    .select("*", { count: "exact" })
    .order("changed_at", { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1);

  if (table) query = query.eq("table_name", table);
  if (action) query = query.eq("action", action);
  if (actor) query = query.ilike("actor_name", `%${actor}%`);

  const { data: rows, count, error } = await query;

  const qs = (overrides: Record<string, string | number>) => {
    const p = new URLSearchParams();
    if (table) p.set("table", table);
    if (action) p.set("action", action);
    if (actor) p.set("actor", actor);
    p.set("page", String(page));
    for (const [k, v] of Object.entries(overrides)) {
      if (v === "" || v === undefined) p.delete(k);
      else p.set(k, String(v));
    }
    return `?${p.toString()}`;
  };

  const totalPages = count ? Math.ceil(count / PAGE_SIZE) : 1;

  return (
    <main className="flex min-h-screen flex-1 flex-col bg-bg">
      <header className="flex items-center justify-between border-b border-border px-6 py-4">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-xs text-fg-dim hover:text-fg">
            ← Board
          </Link>
          <h1 className="text-xl font-semibold text-fg">Audit log</h1>
        </div>
        <SignOutButton />
      </header>

      <div className="mx-auto w-full max-w-5xl flex-1 px-6 py-6">
        <form className="mb-4 flex flex-wrap items-end gap-3 rounded border border-border bg-surface p-3">
          <Field label="Table">
            <select name="table" defaultValue={table} className="select">
              <option value="">All</option>
              {TABLES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Action">
            <select name="action" defaultValue={action} className="select">
              <option value="">All</option>
              {ACTIONS.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Actor">
            <input name="actor" defaultValue={actor} placeholder="Name contains…" className="select" />
          </Field>
          <button type="submit" className="rounded bg-accent px-3 py-1.5 text-sm font-semibold text-accent-fg">
            Filter
          </button>
          {table || action || actor ? (
            <Link href="/audit-log" className="text-sm text-fg-dim hover:text-fg">
              Clear
            </Link>
          ) : null}
          <span className="ml-auto text-xs text-fg-dim">{count ?? 0} entries</span>
        </form>

        {error ? <p className="text-sm text-danger">{error.message}</p> : null}

        <div className="overflow-x-auto rounded border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface text-left text-xs uppercase tracking-wide text-fg-dim">
                <th className="px-3 py-2">When</th>
                <th className="px-3 py-2">Table</th>
                <th className="px-3 py-2">Action</th>
                <th className="px-3 py-2">Record</th>
                <th className="px-3 py-2">Actor</th>
                <th className="px-3 py-2">Changed fields</th>
              </tr>
            </thead>
            <tbody>
              {(rows ?? []).map((row) => (
                <AuditRow key={row.id} row={row} />
              ))}
              {rows && rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-fg-dim">
                    No matching audit entries.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div className="mt-3 flex items-center justify-between text-sm">
          <Link
            href={qs({ page: Math.max(1, page - 1) })}
            aria-disabled={page <= 1}
            className={`rounded border border-border-strong px-3 py-1.5 ${
              page <= 1 ? "pointer-events-none opacity-40" : "text-fg-muted hover:text-fg"
            }`}
          >
            ← Newer
          </Link>
          <span className="text-fg-dim">
            Page {page} of {totalPages}
          </span>
          <Link
            href={qs({ page: page + 1 })}
            aria-disabled={page >= totalPages}
            className={`rounded border border-border-strong px-3 py-1.5 ${
              page >= totalPages ? "pointer-events-none opacity-40" : "text-fg-muted hover:text-fg"
            }`}
          >
            Older →
          </Link>
        </div>
      </div>

      <style>{`
        .select {
          border-radius: 0.25rem;
          border: 1px solid var(--border-strong);
          background: var(--surface-raised);
          color: var(--fg);
          padding: 0.375rem 0.5rem;
          font-size: 0.875rem;
        }
      `}</style>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs text-fg-muted">{label}</label>
      {children}
    </div>
  );
}

function recordLabel(row: AuditLogRow): string {
  const snapshot = (row.after ?? row.before) as Record<string, unknown> | null;
  if (!snapshot) return row.record_id;
  const candidates = ["call_number", "event_number", "full_name", "unit_id"];
  for (const key of candidates) {
    const v = snapshot[key];
    if (typeof v === "string" && v) return v;
  }
  return row.record_id;
}

const ACTION_STYLES: Record<string, string> = {
  INSERT: "bg-ok/20 text-ok",
  UPDATE: "bg-accent/20 text-accent",
  VOID: "bg-danger/20 text-danger",
};

function AuditRow({ row }: { row: AuditLogRow }) {
  const before = row.before as Record<string, unknown> | null;
  const after = row.after as Record<string, unknown> | null;
  const fields = (row.changed_fields ?? []).filter((f) => !HIDDEN_DIFF_FIELDS.has(f));

  return (
    <>
      <tr className="border-b border-border align-top">
        <td className="whitespace-nowrap px-3 py-2 font-mono-nums text-xs text-fg-muted">
          {formatDateTime(row.changed_at)}
        </td>
        <td className="px-3 py-2 text-fg-muted">{row.table_name}</td>
        <td className="px-3 py-2">
          <span className={`rounded px-1.5 py-0.5 text-xs font-semibold ${ACTION_STYLES[row.action] ?? ""}`}>
            {row.action}
          </span>
        </td>
        <td className="px-3 py-2 font-mono-nums text-fg">{recordLabel(row)}</td>
        <td className="px-3 py-2 text-fg-muted">{row.actor_name ?? "system"}</td>
        <td className="px-3 py-2">
          {row.action === "INSERT" ? (
            <span className="text-xs text-fg-dim">created</span>
          ) : fields.length === 0 ? (
            <span className="text-xs text-fg-dim">—</span>
          ) : (
            <details>
              <summary className="cursor-pointer text-xs text-fg-muted hover:text-fg">
                {fields.length} field{fields.length === 1 ? "" : "s"}
              </summary>
              <dl className="mt-1 space-y-0.5">
                {fields.map((f) => (
                  <div key={f} className="text-xs">
                    <dt className="inline font-semibold text-fg-muted">{f}:</dt>{" "}
                    <dd className="inline text-fg-dim">{formatValue(before?.[f])}</dd>{" "}
                    <span className="text-fg-dim">→</span>{" "}
                    <dd className="inline text-fg">{formatValue(after?.[f])}</dd>
                  </div>
                ))}
              </dl>
            </details>
          )}
        </td>
      </tr>
    </>
  );
}

function formatValue(v: unknown): string {
  if (v === null || v === undefined) return "∅";
  if (typeof v === "boolean") return v ? "true" : "false";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}
