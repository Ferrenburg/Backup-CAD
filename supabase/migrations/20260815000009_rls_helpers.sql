-- CAD Downtime Log — migration 0009
-- RLS helper functions, used by policies instead of repeating subqueries.

create or replace function public.current_role()
returns text
language sql
security definer
stable
set search_path = public
as $$
  select role from profiles where id = auth.uid();
$$;

comment on function public.current_role() is
  'Returns the calling user''s app role (dispatcher/supervisor/admin/readonly), or null if unauthenticated / no profile.';

create or replace function public.current_user_active()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce((select active from profiles where id = auth.uid()), false);
$$;

comment on function public.current_user_active() is
  'Returns whether the calling user''s profile is active. Deactivated users lose access even if their role would otherwise permit it.';

-- Enforce role gating on calls that RLS alone can't express column-by-column:
--  - only supervisor/admin may void a call (voided false -> true)
--  - only supervisor/admin may set/change back-entry verification
create or replace function public.enforce_call_permission_rules()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.voided = true and old.voided = false and public.current_role() not in ('supervisor', 'admin') then
    raise exception 'Only a supervisor or admin may void a call';
  end if;

  if new.verified_by is distinct from old.verified_by
     and new.verified_by is not null
     and public.current_role() not in ('supervisor', 'admin') then
    raise exception 'Only a supervisor or admin may verify back-entry';
  end if;

  return new;
end;
$$;

create trigger calls_enforce_permission_rules
  before update on public.calls
  for each row execute function public.enforce_call_permission_rules();

-- Prevent a non-admin from escalating their own role/active/agency via the
-- self-update policy on profiles.
create or replace function public.enforce_profile_self_update_rules()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.current_role() = 'admin' then
    return new;
  end if;

  if new.role is distinct from old.role
     or new.active is distinct from old.active
     or new.agency is distinct from old.agency then
    raise exception 'Only an admin may change role, active status, or agency';
  end if;

  return new;
end;
$$;

create trigger profiles_enforce_self_update_rules
  before update on public.profiles
  for each row execute function public.enforce_profile_self_update_rules();
