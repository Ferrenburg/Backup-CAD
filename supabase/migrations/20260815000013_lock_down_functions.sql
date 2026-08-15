-- CAD Downtime Log — migration 0013
-- Harden functions per security advisor: pin search_path, and revoke direct
-- PostgREST RPC execution on functions that exist only to be called by
-- triggers or other definer functions, never directly by a client.

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke execute on function public.handle_new_user() from anon, authenticated;
revoke execute on function public.set_call_number() from anon, authenticated;
revoke execute on function public.audit_row_change() from anon, authenticated;
revoke execute on function public.enforce_call_permission_rules() from anon, authenticated;
revoke execute on function public.enforce_profile_self_update_rules() from anon, authenticated;
revoke execute on function public.next_call_number(integer) from anon, authenticated;

-- current_role() / current_user_active() stay executable by authenticated —
-- RLS policies invoke them in the querying user's own context and they only
-- ever reveal the caller's own role/active flag.
revoke execute on function public.current_role() from anon;
revoke execute on function public.current_user_active() from anon;
