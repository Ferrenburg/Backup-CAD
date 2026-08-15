-- CAD Downtime Log — migration 0011
-- Nothing is ever hard-deleted (§3.3). Revoke DELETE at the database level
-- for application roles, on every table. Also revoke direct writes to
-- audit_log and call_number_counters — those are touched only by
-- security-definer functions/triggers.

revoke delete on public.profiles from authenticated, anon;
revoke delete on public.outages from authenticated, anon;
revoke delete on public.calls from authenticated, anon;
revoke delete on public.unit_assignments from authenticated, anon;
revoke delete on public.lookups from authenticated, anon;
revoke delete on public.units from authenticated, anon;

revoke insert, update, delete on public.audit_log from authenticated, anon;
revoke insert, update, delete on public.call_number_counters from authenticated, anon;
revoke select on public.call_number_counters from authenticated, anon;
