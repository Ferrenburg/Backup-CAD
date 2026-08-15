-- CAD Downtime Log — migration 0019
-- Per-account MFA exemption. §6.3 requires MFA for every account by
-- default; this is a deliberate, admin-only, audited per-user override —
-- not a default, and not something a user can grant themselves.

alter table public.profiles add column mfa_exempt boolean not null default false;

comment on column public.profiles.mfa_exempt is
  'Deliberate per-account exemption from the MFA requirement in §6.3. Default false. Settable only by an admin (enforced by enforce_profile_self_update_rules) — every change is captured by the profiles_audit trigger.';

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
     or new.agency is distinct from old.agency
     or new.mfa_exempt is distinct from old.mfa_exempt then
    raise exception 'Only an admin may change role, active status, agency, or MFA exemption';
  end if;

  return new;
end;
$$;
