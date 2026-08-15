# CAD Downtime Log

Manual call-intake and unit-tracking console for the Alabama-Coushatta Tribe of
Texas Department of Public Safety, used when the CAD system is unavailable.
See `docs/spec.md`-equivalent context in the original build spec for full
background — this README covers what's here and how to run it.

**Stack:** Next.js 16 (App Router) + Supabase (Postgres, Auth, Realtime, RLS) + Vercel.

## Status

All ten build phases in the spec are implemented: schema/RLS/audit trail,
auth + MFA, outage lifecycle, the board, unit assignments, realtime,
reconciliation + closeout gating, report + CSV export, and admin screens.

A live Supabase project (`actt-cad-downtime-log`, `us-east-1`) has the full
schema applied and has been exercised directly against Postgres (impersonating
each role via `SET ROLE` + `request.jwt.claims`, the same mechanism PostgREST
uses) to confirm: anon reads zero rows everywhere, role gating on
insert/update/void/verify, concurrent call numbering with no gaps, the audit
trigger firing on insert/update/void, the same-actor verification constraint,
and DELETE being rejected on `calls`/`unit_assignments`/`audit_log`. See
"What hasn't been verified" below for what's still open — this session's
outbound network policy blocks direct HTTPS to the Supabase REST/Auth API, so
no browser or MFA-enrollment flow has actually been clicked through.

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in the values below
npm run dev
```

### Environment variables

| var | where to get it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase dashboard → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | same page, "anon" / "publishable" key |
| `SUPABASE_SERVICE_ROLE_KEY` | same page, "service_role" key — **server-only**, needed only for `/admin/users` invites. Never expose to the browser. |

`.env.local` already has the URL/anon key for the `actt-cad-downtime-log`
Supabase project wired up; the service role key is intentionally left blank —
fetch it from the dashboard and set it locally and in Vercel yourself.

### Database

All schema is in `supabase/migrations/*.sql`, applied in filename order. They
are also already applied to the live project. To apply them to a different
project (e.g. promoting to a separate production instance), run them in order
through the Supabase SQL editor, the `supabase` CLI, or the
`mcp__Supabase__apply_migration` tool — in that exact numeric order, since
later files depend on functions/tables created earlier.

## Deploying

This repo is a standard Next.js App Router project — connect it to Vercel,
set the three environment variables above, and deploy. Set the Supabase
project to a US region with point-in-time recovery enabled and MFA required
(§3.5 of the spec) — both are already true of `actt-cad-downtime-log`.

## Architecture notes

- **RLS is the enforcement boundary**, not the app. Every mutation goes
  through a Server Action or Route Handler that uses the *anon-key* server
  client — permissions come entirely from Postgres RLS policies plus a
  handful of `BEFORE`-trigger business rules (void requires
  supervisor/admin, verify requires supervisor/admin and a different actor
  than back-entry, self-role-escalation is blocked). The app-layer role
  checks in `lib/auth.ts` / `lib/roles.ts` are UX only — hiding buttons a
  user isn't allowed to use — never the actual gate.
- **Call numbering** (`next_call_number()` + a `BEFORE INSERT` trigger on
  `calls`) is fully server-side and race-safe — verified with genuinely
  concurrent inserts, see "What was tested" below.
- **Audit trail** (`audit_row_change()`) is a generic trigger on `outages`,
  `calls`, `unit_assignments`, and `profiles`, `SECURITY DEFINER` so it can
  write to `audit_log` even though no application role has direct INSERT
  there. It classifies a `voided: false → true` transition as a `VOID`
  action distinct from `UPDATE`.
- **The board** (`/outage/[id]`) holds live-synced `calls` and
  `unit_assignments` state in `BoardProvider` (`src/components/board/board-context.tsx`),
  fed by Supabase Realtime `postgres_changes` subscriptions. The call
  list/detail pane split is implemented as nested App Router routes sharing
  `outage/[id]/layout.tsx`, so switching calls doesn't remount the list.
- **Local draft persistence** (`src/lib/use-draft.ts`) is crash insurance
  only, not offline sync, per the spec's explicit scope call.
- **CSV export headers** (`src/app/api/outage/[id]/export/*`) are a
  best-effort reconstruction of a typical dispatch-log column layout. The
  spec says they should match the agency's retiring Excel workbook exactly —
  that workbook wasn't available in this session, so treat the header list
  as a draft to reconcile against the real file before go-live.

## What was tested (against the live Supabase project)

Run directly against Postgres via `mcp__Supabase__execute_sql`, impersonating
each role with `SET ROLE authenticated; SET request.jwt.claims = '{"sub":"...","role":"authenticated"}'`
— the same identity mechanism PostgREST uses, so this exercises the real RLS
policies and triggers, not a mock:

- Unauthenticated (`anon`) reads zero rows from every table.
- A `readonly` user reads zero rows from `outages`/`calls`/`audit_log`, sees
  only their own `profiles` row, and can read `lookups`/`units`.
- A `dispatcher` can insert a call into an open outage but cannot declare an
  outage, cannot void a call, cannot close an outage, and cannot verify
  back-entry (rejected by the `enforce_call_permission_rules` trigger with a
  clear error).
- A `supervisor` can void a call and perform back-entry, but cannot verify
  their *own* back-entry — rejected by the `calls_verifier_check` CHECK
  constraint. A different actor (tested with `admin`) can verify it.
- Two genuinely concurrent `INSERT`s (fired as parallel tool calls) produced
  sequential call numbers with no gap and no collision. A voided call keeps
  its number; the next call issued afterward continues the sequence.
- `DELETE` on `calls`, `unit_assignments`, and `audit_log` is rejected with
  `permission denied` for every role tested, including `admin`.
- `INSERT`/`UPDATE` on `audit_log` is rejected directly; the audit trigger
  itself (running as table owner) is the only writer. A `supervisor` can
  read `audit_log`; a `dispatcher` sees zero rows.
- `lib/time.ts`'s `parseManualTime`/`computeCallDurations` were run directly:
  a call received at 23:50 and cleared at 00:15 (typed as `0015`) resolves
  to the next calendar day and computes a positive 25-minute total, not a
  negative duration.
- `npm run build` and `npm run lint` are clean.

## What hasn't been verified

This session's network policy blocks outbound HTTPS to the Supabase project
host directly (only the Supabase MCP tools, which go through a different
path, could reach it), and there's no deployed Vercel instance or browser in
this environment. So, not exercised end-to-end:

- The actual UI — login, MFA enrollment/challenge, the board's keyboard
  shortcuts, timestamp buttons, realtime updates between two open tabs, the
  reconciliation queue UI, admin screens.
- MFA enrollment/verification against the real Supabase Auth API (the
  policy logic in `proxy.ts` is written and matches the documented
  `getAuthenticatorAssuranceLevel()` contract, but no TOTP factor has
  actually been enrolled and challenged through it).
- The `/admin/users` invite flow, which needs `SUPABASE_SERVICE_ROLE_KEY` —
  not set in this session, left blank intentionally (see Environment
  variables above).
- CSV export column headers against the real Excel workbook (see above).
- Printed output of the shift report on actual paper (`@media print` rules
  are in `globals.css` and `report/page.tsx`, but only reasoned through, not
  print-previewed).

Recommend a pass in a real browser against the deployed Vercel app — sign
up an account, have an admin assign it a role, enroll MFA, declare a test
outage, and work through the board — before this goes in front of
dispatchers.
