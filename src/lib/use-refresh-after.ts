"use client";

import { useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

/**
 * Schedules a router.refresh() a short delay after a write action, so the
 * board's Server Component data (and therefore BoardProvider's state, via
 * its resync-from-props logic) reconciles with whatever just got written —
 * a backstop alongside the optimistic local update and the realtime
 * subscription, not a replacement for either.
 */
export function useRefreshAfter(delayMs = 500) {
  const router = useRouter();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  return useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      router.refresh();
    }, delayMs);
  }, [router, delayMs]);
}
