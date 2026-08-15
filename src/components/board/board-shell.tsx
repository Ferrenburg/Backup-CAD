"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, usePathname, useRouter } from "next/navigation";
import { CallList } from "./call-list";
import { useBoardContext } from "./board-context";
import { CjiBanner } from "@/components/cji-banner";
import { ShortcutHelp } from "./shortcut-help";
import { stampCallTimeAction } from "@/app/outage/[id]/calls-actions";
import { canDispatch } from "@/lib/roles";

function isTypingTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el.isContentEditable;
}

export function BoardShell({ children }: { children: React.ReactNode }) {
  const { calls, profile, outage } = useBoardContext();
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams<{ id: string }>();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [helpOpen, setHelpOpen] = useState(false);

  const selectedCallId = pathname.match(/\/call\/([^/]+)/)?.[1] ?? null;

  const visibleIds = calls
    .filter((c) => c.status === "active")
    .sort((a, b) => new Date(b.received_at).getTime() - new Date(a.received_at).getTime())
    .map((c) => c.id);

  const goToOffset = useCallback(
    (offset: number) => {
      if (visibleIds.length === 0) return;
      const idx = selectedCallId ? visibleIds.indexOf(selectedCallId) : -1;
      const next = idx === -1 ? 0 : Math.min(Math.max(idx + offset, 0), visibleIds.length - 1);
      router.push(`/outage/${params.id}/call/${visibleIds[next]}`);
    },
    [visibleIds, selectedCallId, router, params.id]
  );

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (isTypingTarget(e.target)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      switch (e.key) {
        case "n":
        case "N":
          if (canDispatch(profile.role, profile.active)) {
            e.preventDefault();
            router.push(`/outage/${params.id}/call/new`);
          }
          break;
        case "j":
        case "J":
          e.preventDefault();
          goToOffset(1);
          break;
        case "k":
        case "K":
          e.preventDefault();
          goToOffset(-1);
          break;
        case "/":
          e.preventDefault();
          searchInputRef.current?.focus();
          break;
        case "Escape":
          e.preventDefault();
          router.push(`/outage/${params.id}`);
          break;
        case "?":
          e.preventDefault();
          setHelpOpen((v) => !v);
          break;
        case "d":
        case "D":
        case "e":
        case "E":
        case "o":
        case "O":
        case "c":
        case "C": {
          if (!selectedCallId) break;
          const map: Record<string, "dispatched_at" | "first_enroute_at" | "first_on_scene_at" | "last_cleared_at"> = {
            d: "dispatched_at",
            e: "first_enroute_at",
            o: "first_on_scene_at",
            c: "last_cleared_at",
          };
          const field = map[e.key.toLowerCase()];
          if (field) {
            e.preventDefault();
            void stampCallTimeAction(params.id, selectedCallId, field);
          }
          break;
        }
        case "u":
        case "U":
          if (selectedCallId) {
            e.preventDefault();
            window.dispatchEvent(new CustomEvent("board:add-unit"));
          }
          break;
        default:
          break;
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [goToOffset, params.id, profile, router, selectedCallId]);

  return (
    <div className="flex min-h-screen flex-1 flex-col">
      <CjiBanner />
      <OutageHeader />
      <div className="flex flex-1 overflow-hidden">
        <aside className="w-[360px] flex-none border-r border-border bg-surface">
          <CallList searchInputRef={searchInputRef} />
        </aside>
        <section className="flex-1 overflow-y-auto bg-bg">{children}</section>
      </div>
      {helpOpen ? <ShortcutHelp onClose={() => setHelpOpen(false)} /> : null}
      <span className="sr-only" aria-live="polite">
        {outage.event_number}
      </span>
    </div>
  );
}

function OutageHeader() {
  const { outage, profile } = useBoardContext();
  return (
    <header className="no-print flex flex-none items-center justify-between border-b border-border px-4 py-2">
      <div className="flex items-center gap-3">
        <Link href="/" className="text-xs text-fg-dim hover:text-fg">
          ← All events
        </Link>
        <span className="font-mono-nums text-sm font-semibold text-fg">{outage.event_number}</span>
        <StatusBadge status={outage.status} />
      </div>
      <nav className="flex items-center gap-3 text-sm">
        <Link href={`/outage/${outage.id}/notifications`} className="text-fg-muted hover:text-fg">
          Notifications
        </Link>
        <Link href={`/outage/${outage.id}/reconcile`} className="text-fg-muted hover:text-fg">
          Reconcile
        </Link>
        <Link href={`/outage/${outage.id}/report`} className="text-fg-muted hover:text-fg">
          Report
        </Link>
        <a href={`/api/outage/${outage.id}/export`} className="text-fg-muted hover:text-fg">
          Export calls
        </a>
        <a href={`/api/outage/${outage.id}/export/units`} className="text-fg-muted hover:text-fg">
          Export units
        </a>
        {(profile.role === "supervisor" || profile.role === "admin") && (
          <Link href={`/outage/${outage.id}/close`} className="text-fg-muted hover:text-fg">
            Close
          </Link>
        )}
        <span className="text-fg-dim">{profile.full_name}</span>
      </nav>
    </header>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    open: "bg-accent/20 text-accent",
    restored: "bg-warn/20 text-warn",
    closed: "bg-surface-raised text-fg-dim",
  };
  return (
    <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${styles[status] ?? ""}`}>
      {status}
    </span>
  );
}
