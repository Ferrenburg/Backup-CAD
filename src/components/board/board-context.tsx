"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Call, Lookup, LookupCategory, Outage, Profile, Unit, UnitAssignment } from "@/lib/types";

interface BoardContextValue {
  outage: Outage;
  profile: Profile;
  calls: Call[];
  units: Unit[];
  unitAssignments: UnitAssignment[];
  unitsForCall: (callId: string) => UnitAssignment[];
  updateCallLocally: (callId: string, patch: Partial<Call>) => void;
  updateUnitAssignmentLocally: (unitAssignmentId: string, patch: Partial<UnitAssignment>) => void;
  lookupsByCategory: Record<LookupCategory, Lookup[]>;
  now: number;
}

const BoardContext = createContext<BoardContextValue | null>(null);

export function useBoardContext() {
  const ctx = useContext(BoardContext);
  if (!ctx) throw new Error("useBoardContext must be used within BoardProvider");
  return ctx;
}

export function BoardProvider({
  outage,
  profile,
  initialCalls,
  initialUnitAssignments,
  units,
  lookups,
  children,
}: {
  outage: Outage;
  profile: Profile;
  initialCalls: Call[];
  initialUnitAssignments: UnitAssignment[];
  units: Unit[];
  lookups: Lookup[];
  children: React.ReactNode;
}) {
  const [calls, setCalls] = useState<Call[]>(initialCalls);
  const [unitAssignments, setUnitAssignments] = useState<UnitAssignment[]>(initialUnitAssignments);
  const [now, setNow] = useState(() => Date.now());
  const supabaseRef = useRef(createClient());
  const callIdsRef = useRef<Set<string>>(new Set(initialCalls.map((c) => c.id)));

  // The outage layout is a Server Component — every router.refresh() re-runs
  // its fetch and hands us a brand new `initialCalls`/`initialUnitAssignments`
  // array. Re-sync local state from it whenever that happens (render-time
  // adjustment, not an effect, so it can't race the realtime subscription
  // below) — this is what makes the "refresh shortly after a write" pattern
  // actually reconcile with the server instead of being a no-op.
  const [prevInitialCalls, setPrevInitialCalls] = useState(initialCalls);
  if (initialCalls !== prevInitialCalls) {
    setPrevInitialCalls(initialCalls);
    setCalls(initialCalls);
  }
  const [prevInitialUnitAssignments, setPrevInitialUnitAssignments] = useState(initialUnitAssignments);
  if (initialUnitAssignments !== prevInitialUnitAssignments) {
    setPrevInitialUnitAssignments(initialUnitAssignments);
    setUnitAssignments(initialUnitAssignments);
  }

  useEffect(() => {
    callIdsRef.current = new Set(calls.map((c) => c.id));
  }, [calls]);

  // Live elapsed-time ticking (§8 — the largest text in each call row).
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // Realtime: a second dispatcher sees changes without refreshing (§7.2).
  useEffect(() => {
    const supabase = supabaseRef.current;
    const channel = supabase
      .channel(`outage-${outage.id}-calls`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "calls", filter: `outage_id=eq.${outage.id}` },
        (payload) => {
          setCalls((prev) => {
            if (payload.eventType === "INSERT") {
              const row = payload.new as Call;
              if (prev.some((c) => c.id === row.id)) return prev;
              return [row, ...prev];
            }
            if (payload.eventType === "UPDATE") {
              const row = payload.new as Call;
              return prev.map((c) => (c.id === row.id ? row : c));
            }
            return prev;
          });
        }
      )
      .subscribe();

    const unitChannel = supabase
      .channel(`outage-${outage.id}-unit-assignments`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "unit_assignments" },
        (payload) => {
          const row = (payload.new ?? payload.old) as UnitAssignment;
          if (!row || !callIdsRef.current.has(row.call_id)) return;

          setUnitAssignments((prev) => {
            if (payload.eventType === "INSERT") {
              if (prev.some((u) => u.id === row.id)) return prev;
              return [...prev, row];
            }
            if (payload.eventType === "UPDATE") {
              return prev.map((u) => (u.id === row.id ? row : u));
            }
            return prev;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(unitChannel);
    };
  }, [outage.id]);

  const unitsForCall = (callId: string) =>
    unitAssignments.filter((u) => u.call_id === callId);

  // Optimistic updates: applied immediately on click, before the server
  // action round-trips, so a tap feels instant. Realtime and/or the
  // scheduled refresh reconcile with the authoritative row shortly after.
  function updateCallLocally(callId: string, patch: Partial<Call>) {
    setCalls((prev) => prev.map((c) => (c.id === callId ? { ...c, ...patch } : c)));
  }
  function updateUnitAssignmentLocally(unitAssignmentId: string, patch: Partial<UnitAssignment>) {
    setUnitAssignments((prev) => prev.map((u) => (u.id === unitAssignmentId ? { ...u, ...patch } : u)));
  }

  const lookupsByCategory = useMemo(() => {
    const grouped: Record<string, Lookup[]> = {};
    for (const l of lookups) {
      if (!l.active) continue;
      (grouped[l.category] ??= []).push(l);
    }
    for (const key of Object.keys(grouped)) {
      grouped[key].sort((a, b) => a.sort_order - b.sort_order);
    }
    return grouped as Record<LookupCategory, Lookup[]>;
  }, [lookups]);

  const value: BoardContextValue = {
    outage,
    profile,
    calls,
    units,
    unitAssignments,
    unitsForCall,
    updateCallLocally,
    updateUnitAssignmentLocally,
    lookupsByCategory,
    now,
  };

  return <BoardContext.Provider value={value}>{children}</BoardContext.Provider>;
}
