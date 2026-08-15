-- CAD Downtime Log — migration 0007
-- unit_assignments: one row per unit per call.

create table public.unit_assignments (
  id uuid primary key default gen_random_uuid(),
  call_id uuid not null references public.calls(id) on delete restrict,
  unit_id text not null references public.units(id),
  personnel text,
  dispatched_at timestamptz,
  enroute_at timestamptz,
  on_scene_at timestamptz,
  transporting_at timestamptz,
  at_destination_at timestamptz,
  cleared_at timestamptz,
  unit_disposition text,
  odometer_start integer,
  odometer_end integer,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.unit_assignments is
  'One row per unit per call. CJI/PHI RESTRICTION: never record criminal justice or protected health information in any free-text field.';
comment on column public.unit_assignments.personnel is
  'Free text: names and badge numbers. CJI/PHI RESTRICTION: no criminal justice or protected health information may be stored anywhere in this system.';
comment on column public.unit_assignments.notes is
  'CJI/PHI RESTRICTION: no criminal justice or protected health information may be stored anywhere in this system.';
comment on column public.unit_assignments.odometer_start is
  'Kept for FEMA Public Assistance force account equipment claims.';
comment on column public.unit_assignments.odometer_end is
  'Kept for FEMA Public Assistance force account equipment claims.';

create index unit_assignments_call_idx on public.unit_assignments (call_id);
create index unit_assignments_unit_dispatched_idx on public.unit_assignments (unit_id, dispatched_at desc);

create trigger unit_assignments_set_updated_at
  before update on public.unit_assignments
  for each row execute function public.set_updated_at();
