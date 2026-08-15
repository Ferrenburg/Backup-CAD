-- CAD Downtime Log — migration 0014
-- Postgres grants EXECUTE to PUBLIC by default on function creation, which
-- supersedes the per-role revokes in migration 0013. Revoke from PUBLIC
-- explicitly, then re-grant only what's actually needed.

revoke execute on function public.handle_new_user() from public;
revoke execute on function public.set_call_number() from public;
revoke execute on function public.audit_row_change() from public;
revoke execute on function public.enforce_call_permission_rules() from public;
revoke execute on function public.enforce_profile_self_update_rules() from public;
revoke execute on function public.next_call_number(integer) from public;
revoke execute on function public.set_updated_at() from public;

revoke execute on function public.current_role() from public;
revoke execute on function public.current_user_active() from public;
grant execute on function public.current_role() to authenticated;
grant execute on function public.current_user_active() to authenticated;

-- Residual advisories accepted by design after this migration:
--  - call_number_counters has RLS enabled with no policy at all (deny-all
--    for every application role; only next_call_number(), itself
--    unreachable via RPC, touches this table).
--  - current_role()/current_user_active() remain callable by authenticated
--    because RLS policies invoke them in the caller's own context and they
--    only ever reveal the caller's own role/active flag.
