"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { inviteUserAction } from "../actions";
import type { Role } from "@/lib/types";

export function InviteForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<Role>("dispatcher");
  const [agency, setAgency] = useState("PD");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await inviteUserAction(email, fullName, role, agency);
      if (result.error) {
        setError(result.error);
      } else {
        setEmail("");
        setFullName("");
        setError(null);
        router.refresh();
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-2 rounded border border-border bg-surface p-3">
      <div>
        <label className="mb-1 block text-xs text-fg-muted">Email</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded border border-border-strong bg-surface-raised px-2 py-1.5 text-fg"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs text-fg-muted">Full name</label>
        <input
          required
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className="rounded border border-border-strong bg-surface-raised px-2 py-1.5 text-fg"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs text-fg-muted">Agency</label>
        <select value={agency} onChange={(e) => setAgency(e.target.value)} className="rounded border border-border-strong bg-surface-raised px-2 py-1.5 text-fg">
          <option value="PD">PD</option>
          <option value="Fire">Fire</option>
          <option value="EMS">EMS</option>
          <option value="OEM">OEM</option>
        </select>
      </div>
      <div>
        <label className="mb-1 block text-xs text-fg-muted">Role</label>
        <select value={role} onChange={(e) => setRole(e.target.value as Role)} className="rounded border border-border-strong bg-surface-raised px-2 py-1.5 text-fg">
          <option value="dispatcher">dispatcher</option>
          <option value="supervisor">supervisor</option>
          <option value="admin">admin</option>
        </select>
      </div>
      <button
        type="submit"
        disabled={isPending}
        className="rounded bg-accent px-3 py-1.5 text-sm font-semibold text-accent-fg disabled:opacity-60"
      >
        {isPending ? "Inviting…" : "Invite"}
      </button>
      {error ? <p className="w-full text-sm text-danger">{error}</p> : null}
    </form>
  );
}
