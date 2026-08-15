-- CAD Downtime Log — migration 0004
-- outages: one row per CAD downtime event. Every call belongs to exactly one.

create table public.outages (
  id uuid primary key default gen_random_uuid(),
  event_number text not null unique,
  failure_detected_at timestamptz not null,
  detected_by text not null,
  failure_nature text,
  systems_still_operational text,
  notifications jsonb not null default '{}'::jsonb,
  manual_logging_started_at timestamptz,
  paper_forms_used boolean not null default false,
  paper_form_call_numbers text,
  cad_restored_at timestamptz,
  restoration_confirmed_by text,
  last_call_number_issued text,
  back_entry_started_at timestamptz,
  back_entry_completed_at timestamptz,
  back_entry_performed_by text,
  back_entry_verified_by text,
  gaps_found boolean,
  aar_required boolean,
  aar_completed_at timestamptz,
  notes text,
  status text not null default 'open',
  opened_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  constraint outages_status_check check (status in ('open', 'restored', 'closed')),
  constraint outages_back_entry_verifier_check check (
    back_entry_verified_by is null
    or back_entry_performed_by is null
    or back_entry_verified_by <> back_entry_performed_by
  )
);

comment on table public.outages is
  'One row per CAD downtime event. CJI/PHI RESTRICTION: never record criminal justice or protected health information in any free-text field on this table.';
comment on column public.outages.failure_nature is
  'CJI/PHI RESTRICTION: no NCIC/TCIC/TLETS data, criminal history, DL/vehicle registration returns, wanted/protective-order hits, biometric, or booking data. No diagnoses, medications, or patient history beyond chief complaint context.';
comment on column public.outages.systems_still_operational is
  'CJI/PHI RESTRICTION: free text describing operational systems only (phones, radio, ANI/ALI, mobile data) — do not record CJI or PHI here.';
comment on column public.outages.notes is
  'CJI/PHI RESTRICTION: no criminal justice or protected health information may be stored anywhere in this system.';
comment on column public.outages.notifications is
  'Keyed notification log. Shape: { "<key>": { "at": timestamptz|null, "by": text|null, "method": text|null } } for each of it_vendor, on_duty_sup, director_oem, chief_of_police, fire_chief, allegiance_ems, polk_co_so, tribal_admin.';
comment on column public.outages.last_call_number_issued is
  'Populated at close. All higher call numbers issued after this point are void.';

create index outages_status_idx on public.outages (status);
