-- CAD Downtime Log — migration 0006
-- calls: one row per logged call during a downtime event.

create table public.calls (
  id uuid primary key default gen_random_uuid(),
  outage_id uuid not null references public.outages(id) on delete restrict,
  call_number text not null unique,
  received_at timestamptz not null,
  call_source text not null,
  activity_type text not null,
  agency_responding text,
  priority text,
  call_type text,
  location_address text,
  location_apt text,
  cross_street text,
  jurisdiction text,
  caller_name text,
  caller_phone text,
  caller_location text,
  narrative jsonb not null default '[]'::jsonb,
  dispatched_at timestamptz,
  first_enroute_at timestamptz,
  first_on_scene_at timestamptz,
  last_cleared_at timestamptz,
  disposition text,
  report_taken boolean,
  case_number text,
  nfirs_number text,
  ems_transport text,
  destination_facility text,
  call_taker_id uuid references public.profiles(id),
  dispatcher_id uuid references public.profiles(id),
  entered_into_cad boolean not null default false,
  cad_call_number text,
  back_entered_by uuid references public.profiles(id),
  back_entered_at timestamptz,
  verified_by uuid references public.profiles(id),
  verified_at timestamptz,
  voided boolean not null default false,
  void_reason text,
  voided_by uuid references public.profiles(id),
  voided_at timestamptz,
  status text not null default 'active',
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint calls_status_check check (status in ('active', 'cleared', 'voided')),
  constraint calls_ems_transport_check check (ems_transport is null or ems_transport in ('Y', 'N', 'N/A')),
  constraint calls_verifier_check check (verified_by is null or back_entered_by is null or verified_by <> back_entered_by)
);

comment on table public.calls is
  'One row per logged call during a downtime event. CJI/PHI RESTRICTION: never record criminal justice or protected health information (NCIC/TCIC/TLETS returns, criminal history, DL/vehicle registration returns, wanted/protective-order hits, biometric or booking data) or protected health information beyond dispatch chief-complaint need (no diagnoses, medications, or patient history).';
comment on column public.calls.narrative is
  'Append-only jsonb array of {at, author, text} entries. CJI/PHI RESTRICTION: no criminal justice or protected health information may be recorded here — chief complaint only, no diagnoses/medications/patient history, no NCIC/TCIC/TLETS or criminal history data.';
comment on column public.calls.location_address is 'CJI/PHI RESTRICTION: no criminal justice or protected health information may be stored anywhere in this system.';
comment on column public.calls.location_apt is 'CJI/PHI RESTRICTION: no criminal justice or protected health information may be stored anywhere in this system.';
comment on column public.calls.cross_street is 'CJI/PHI RESTRICTION: no criminal justice or protected health information may be stored anywhere in this system.';
comment on column public.calls.caller_name is 'CJI/PHI RESTRICTION: no criminal justice or protected health information may be stored anywhere in this system.';
comment on column public.calls.caller_phone is 'CJI/PHI RESTRICTION: no criminal justice or protected health information may be stored anywhere in this system.';
comment on column public.calls.caller_location is 'CJI/PHI RESTRICTION: no criminal justice or protected health information may be stored anywhere in this system.';
comment on column public.calls.case_number is 'CJI/PHI RESTRICTION: internal case reference only — never a criminal history or NCIC/TCIC/TLETS record. No criminal justice or protected health information may be stored anywhere in this system.';
comment on column public.calls.destination_facility is 'CJI/PHI RESTRICTION: facility name only — no diagnoses, medications, or patient history. No criminal justice or protected health information may be stored anywhere in this system.';
comment on column public.calls.void_reason is 'CJI/PHI RESTRICTION: no criminal justice or protected health information may be stored anywhere in this system.';
comment on column public.calls.dispatched_at is 'Computed fields (dispatch delay, response time, total call time) are derived in the app layer from the four timestamps, never stored — corrections would otherwise go stale.';
comment on column public.calls.ems_transport is 'Y, N, N/A, or null meaning not reported to dispatch.';

create index calls_outage_received_idx on public.calls (outage_id, received_at desc);
create index calls_outage_status_idx on public.calls (outage_id, status);
create index calls_not_entered_into_cad_idx on public.calls (outage_id) where entered_into_cad = false;

-- Generic updated_at bump, reused by calls and unit_assignments.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger calls_set_updated_at
  before update on public.calls
  for each row execute function public.set_updated_at();

-- Auto-issue the call number at creation, from received_at's calendar year
-- in America/Chicago. Never pre-allocated, never client-supplied.
create or replace function public.set_call_number()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.call_number is null then
    new.call_number := public.next_call_number(
      extract(year from (new.received_at at time zone 'America/Chicago'))::integer
    );
  end if;
  return new;
end;
$$;

create trigger calls_set_call_number
  before insert on public.calls
  for each row execute function public.set_call_number();
