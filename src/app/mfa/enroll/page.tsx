import { MfaEnrollClient } from "./enroll-client";

// Needs a live Supabase client and the user's session — never prerender
// this at build time (would require env vars to be present at build time,
// and there's nothing useful to statically render anyway). `dynamic` route
// segment config only takes effect from a Server Component, hence the
// split from the "use client" implementation.
export const dynamic = "force-dynamic";

export default function MfaEnrollPage() {
  return <MfaEnrollClient />;
}
