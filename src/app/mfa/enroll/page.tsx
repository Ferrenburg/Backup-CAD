"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function MfaEnrollPage() {
  const supabase = createClient();
  const router = useRouter();

  const [factorId, setFactorId] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function enroll() {
      const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp" });
      if (cancelled) return;
      if (error) {
        setError(error.message);
        return;
      }
      setFactorId(data.id);
      setQrCode(data.totp.qr_code);
      setSecret(data.totp.secret);
    }
    enroll();
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
        <h1 className="text-lg font-semibold text-fg">Set up multi-factor authentication</h1>
        <p className="mt-1 text-sm text-fg-muted">
          Required for every account before the log can be used. Scan the code with an
          authenticator app (Authy, Google Authenticator, 1Password, etc.).
        </p>

        {error ? (
          <p role="alert" className="mt-3 text-sm text-danger">
            {error}
          </p>
        ) : null}

        {qrCode ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={qrCode}
            alt="Scan with your authenticator app"
            className="mx-auto mt-4 h-44 w-44 rounded bg-white p-2"
          />
        ) : (
          <div className="mt-4 h-44 animate-pulse rounded bg-surface-raised" />
        )}

        {secret ? (
          <p className="mt-2 break-all text-center font-mono-nums text-xs text-fg-dim">
            Manual key: {secret}
          </p>
        ) : null}

        <form onSubmit={handleVerify} className="mt-4 space-y-3">
          <div>
            <label htmlFor="code" className="mb-1 block text-sm text-fg-muted">
              6-digit code
            </label>
            <input
              id="code"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, ""))}
              autoFocus
              className="w-full rounded border border-border-strong bg-surface-raised px-3 py-2 text-center font-mono-nums text-lg tracking-widest text-fg outline-none focus-visible:outline-accent"
            />
          </div>
          <button
            type="submit"
            disabled={busy || code.length !== 6 || !factorId}
            className="w-full rounded bg-accent px-3 py-2 font-semibold text-accent-fg disabled:opacity-60"
          >
            {busy ? "Verifying…" : "Verify and continue"}
          </button>
        </form>
      </div>
    </main>
  );
}
