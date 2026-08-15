"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useBoardContext } from "@/components/board/board-context";
import { stampNotificationAction } from "../outage-actions";
import { NOTIFICATION_KEYS, NOTIFICATION_LABELS, type NotificationsLog } from "@/lib/types";
import { formatDateTime } from "@/lib/time";
import { canSupervise } from "@/lib/roles";

export default function NotificationsPage() {
  const { outage, profile } = useBoardContext();
  const notifications = (outage.notifications ?? {}) as NotificationsLog;
  const editable = canSupervise(profile.role, profile.active);

  return (
    <div className="mx-auto max-w-2xl px-6 py-6">
      <h1 className="text-lg font-semibold text-fg">Notification checklist</h1>
      <p className="mt-1 text-sm text-fg-muted">
        Tap &quot;notified&quot; the moment each party is reached. This log is part of the
        outage record.
      </p>

      <ul className="mt-4 divide-y divide-border rounded-lg border border-border">
        {NOTIFICATION_KEYS.map((key) => (
          <NotificationRow
            key={key}
            outageId={outage.id}
            label={NOTIFICATION_LABELS[key]}
            keyName={key}
            entry={notifications[key]}
            editable={editable}
            defaultBy={profile.full_name}
          />
        ))}
      </ul>
    </div>
  );
}

function NotificationRow({
  outageId,
  label,
  keyName,
  entry,
  editable,
  defaultBy,
}: {
  outageId: string;
  label: string;
  keyName: (typeof NOTIFICATION_KEYS)[number];
  entry?: { at: string | null; by: string | null; method: string | null };
  editable: boolean;
  defaultBy: string;
}) {
  const router = useRouter();
  const [method, setMethod] = useState("phone");
  const [busy, setBusy] = useState(false);
  const notified = Boolean(entry?.at);

  return (
    <li className="flex items-center justify-between gap-3 px-4 py-3">
      <div>
        <div className="text-sm text-fg">{label}</div>
        {notified ? (
          <div className="text-xs text-fg-dim">
            {formatDateTime(entry!.at)} by {entry!.by} ({entry!.method})
          </div>
        ) : (
          <div className="text-xs text-fg-dim">Not yet notified</div>
        )}
      </div>
      {editable && !notified ? (
        <div className="flex items-center gap-2">
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            className="rounded border border-border-strong bg-surface-raised px-2 py-1 text-xs text-fg"
          >
            <option value="phone">Phone</option>
            <option value="radio">Radio</option>
            <option value="in_person">In person</option>
            <option value="email">Email</option>
            <option value="text">Text</option>
          </select>
          <button
            type="button"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              await stampNotificationAction(outageId, keyName, defaultBy, method);
              setBusy(false);
              router.refresh();
            }}
            className="rounded bg-accent px-2 py-1 text-xs font-semibold text-accent-fg disabled:opacity-60"
          >
            Notified now
          </button>
        </div>
      ) : notified ? (
        <span className="rounded bg-ok/20 px-2 py-1 text-xs font-semibold text-ok">Done</span>
      ) : null}
    </li>
  );
}
