-- CAD Downtime Log — migration 0002
-- profiles: mirrors auth.users, one row per app user.

create table public.profiles (
  id uuid primary key references auth.users(id) on delete restrict,
  full_name text not null,
  badge_id text,
  agency text not null default '',
  role text not null default 'readonly',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint profiles_role_check check (role in ('dispatcher', 'supervisor', 'admin', 'readonly')),
  constraint profiles_agency_check check (agency in ('PD', 'Fire', 'EMS', 'OEM', ''))
);

comment on table public.profiles is
  'App user profiles. New rows default to role=readonly and no access until an admin assigns a role.';
comment on column public.profiles.badge_id is
  'CJI/PHI RESTRICTION: no criminal justice or protected health information may be stored anywhere in this system. This field is for badge/personnel identification only.';

-- Auto-create a profile row on signup, defaulting to readonly. New users
-- have no access until an admin assigns a role — never default to dispatcher.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email, 'Unknown'),
    'readonly'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
