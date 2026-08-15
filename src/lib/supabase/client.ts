"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./database.types";

// Browser client. Uses the publishable/anon key only — the service role key
// must never reach client code.
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
