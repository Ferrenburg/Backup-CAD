import { MfaVerifyClient } from "./verify-client";

// See mfa/enroll/page.tsx — same reasoning, never prerender at build time.
export const dynamic = "force-dynamic";

export default function MfaVerifyPage() {
  return <MfaVerifyClient />;
}
