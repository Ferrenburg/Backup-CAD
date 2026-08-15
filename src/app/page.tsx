import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile, canSupervise } from "@/lib/auth";
import { SignOutButton } from "@/components/sign-out-button";
import { formatDateTime } from "@/lib/time";

export default async function HomePage() {
  const supabase = await createClient();
  const profile = await getCurrentProfile();

  const { data: openOutage } = await supabase
    .from("outages")
    .select("id")
    .neq("status", "closed")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (openOutage) {
    redirect(`/outage/${openOutage.id}`);
  }

  const { data: outages } = await supabase
    .from("outages")
    .select("id, event_number, status, failure_detected_at, cad_restored_at, created_at")
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <main className="flex min-h-screen flex-1 flex-col bg-bg">
      <header className="flex items-center justify-between border-b border-border px-6 py-4">
        <div>
          <div className="font-mono-nums text-xs uppercase tracking-widest text-fg-dim">
            ACTT DPS
          </div>
          <h1 className="text-xl font-semibold text-fg">CAD Downtime Log</h1>
        </div>
        <div className="flex items-center gap-3">
          {canSupervise(profile) ? (
            <Link href="/audit-log" className="text-sm text-fg-muted hover:text-fg">
              Audit log
            </Link>
          ) : null}
          <span className="text-sm text-fg-muted">{profile?.full_name}</span>
          <SignOutButton />
        </div>
      </header>

      <div className="mx-auto w-full max-w-3xl flex-1 px-6 py-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-fg">Outage events</h2>
          {canSupervise(profile) ? (
            <Link
              href="/outage/new"
              className="rounded bg-accent px-3 py-1.5 text-sm font-semibold text-accent-fg"
            >
              Declare outage
            </Link>
          ) : null}
        </div>

        {!outages || outages.length === 0 ? (
          <p className="text-sm text-fg-muted">No downtime events on record.</p>
        ) : (
          <ul className="divide-y divide-border rounded-lg border border-border">
            {outages.map((o) => (
              <li key={o.id}>
                <Link
                  href={`/outage/${o.id}`}
                  className="flex items-center justify-between px-4 py-3 hover:bg-surface"
                >
                  <div>
                    <div className="font-mono-nums font-semibold text-fg">{o.event_number}</div>
                    <div className="text-xs text-fg-muted">
                      Detected {formatDateTime(o.failure_detected_at)}
                    </div>
                  </div>
                  <StatusPill status={o.status} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}

function StatusPill({ status }: { status: string }) {
  const styles: Record<string, string> = {
    open: "bg-accent/20 text-accent",
    restored: "bg-warn/20 text-warn",
    closed: "bg-surface-raised text-fg-dim",
  };
  return (
    <span className={`rounded px-2 py-1 text-xs font-semibold uppercase ${styles[status] ?? ""}`}>
      {status}
    </span>
  );
}
