"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Local draft persistence (§7.4). Not offline sync — crash insurance. The
 * in-progress intake form is autosaved to localStorage, debounced, and
 * offered back on mount if a draft exists and wasn't cleared by a
 * successful create.
 */
function readDraft<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function useDraft<T extends object>(key: string, initial: T) {
  const [value, setValue] = useState<T>(initial);
  const [restoredAvailable, setRestoredAvailable] = useState<T | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mounted = useRef(false);

  useEffect(() => {
    // Reading localStorage must not happen during the render that produces
    // SSR-matching output (window isn't defined on the server, and doing
    // this in a lazy useState initializer would create a hydration
    // mismatch), so this genuinely needs to run post-mount in an effect.
    const draft = readDraft<T>(key);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (draft) setRestoredAvailable(draft);
  }, [key]);

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      try {
        window.localStorage.setItem(key, JSON.stringify(value));
      } catch {
        // storage full/unavailable — draft insurance is best-effort
      }
    }, 400);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [key, value]);

  function clearDraft() {
    try {
      window.localStorage.removeItem(key);
    } catch {
      // ignore
    }
  }

  function restore() {
    if (restoredAvailable) {
      setValue(restoredAvailable);
      setRestoredAvailable(null);
    }
  }

  function dismissRestore() {
    setRestoredAvailable(null);
    clearDraft();
  }

  return { value, setValue, restoredAvailable, restore, dismissRestore, clearDraft };
}
