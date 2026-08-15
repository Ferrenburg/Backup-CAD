"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function SignOutButton({ className }: { className?: string }) {
  const router = useRouter();
  const supabase = createClient();

  return (
    <button
      type="button"
      onClick={async () => {
        await supabase.auth.signOut();
        router.replace("/login");
        router.refresh();
      }}
      className={
        className ??
        "rounded border border-border-strong px-3 py-1.5 text-sm text-fg-muted hover:text-fg"
      }
    >
      Sign out
    </button>
  );
}
