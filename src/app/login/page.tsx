"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { signInAction, type LoginState } from "./actions";

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result: LoginState = await signInAction({ error: null }, formData);
      if (result.error) {
        setError(result.error);
      } else {
        router.replace("/");
        router.refresh();
      }
    });
  }

  return (
    <main className="flex min-h-screen flex-1 items-center justify-center bg-bg px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="font-mono-nums text-xs uppercase tracking-widest text-fg-dim">
            Alabama-Coushatta Tribe of Texas · DPS
          </div>
          <h1 className="mt-2 text-2xl font-semibold text-fg">CAD Downtime Log</h1>
        </div>

        <form action={handleSubmit} className="space-y-4 rounded-lg border border-border bg-surface p-6">
          <div>
            <label htmlFor="email" className="mb-1 block text-sm text-fg-muted">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="username"
              autoFocus
              className="w-full rounded border border-border-strong bg-surface-raised px-3 py-2 text-fg outline-none focus-visible:outline-accent"
            />
          </div>
          <div>
            <label htmlFor="password" className="mb-1 block text-sm text-fg-muted">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="w-full rounded border border-border-strong bg-surface-raised px-3 py-2 text-fg outline-none focus-visible:outline-accent"
            />
          </div>

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
            {isPending ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-fg-dim">
          Access is provisioned by your agency administrator. New accounts have no
          access until a role is assigned.
        </p>
      </div>
    </main>
  );
}
