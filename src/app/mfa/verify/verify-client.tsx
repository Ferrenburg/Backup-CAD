"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function MfaVerifyClient() {
  const supabase = createClient();
  const router = useRouter();

  const [factorId, setFactorId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function loadFactor() {
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (cancelled) return;
      if (error) {
        setError(error.message);
        return;
      }
      const totp = data.totp[0];
      if (totp) setFactorId(totp.id);
      else setError("No authenticator found. Contact an admin.");
    }
    loadFactor();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    if (!factorId) return;
    setBusy(true);
    setError(null);
    const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
      factorId,
    });
    if (challengeError) {
      setError(challengeError.message);
      setBusy(false);
      return;
    }
    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challenge.id,
      code,
    });
    setBusy(false);
    if (verifyError) {
      setError("Incorrect code. Try again.");
      return;
    }
    router.replace("/");
    router.refresh();
  }

  return (
    <main className="flex min-h-screen flex-1 items-center justify-center bg-bg px-4">
      <div className="w-full max-w-sm rounded-lg border border-border bg-surface p-6">
        <h1 className="text-lg font-semibold text-fg">Enter your authenticator code</h1>
        <p className="mt-1 text-sm text-fg-muted">
          Open your authenticator app and enter the current 6-digit code.
        </p>

        {error ? (
          <p role="alert" className="mt-3 text-sm text-danger">
            {error}
          </p>
        ) : null}

        <form onSubmit={handleVerify} className="mt-4 space-y-3">
          <input
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, ""))}
            autoFocus
            className="w-full rounded border border-border-strong bg-surface-raised px-3 py-2 text-center font-mono-nums text-lg tracking-widest text-fg outline-none focus-visible:outline-accent"
          />
          <button
            type="submit"
            disabled={busy || code.length !== 6 || !factorId}
            className="w-full rounded bg-accent px-3 py-2 font-semibold text-accent-fg disabled:opacity-60"
          >
            {busy ? "Verifying…" : "Verify"}
          </button>
        </form>
      </div>
    </main>
  );
}
