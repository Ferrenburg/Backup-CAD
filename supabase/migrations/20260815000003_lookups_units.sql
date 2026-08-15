-- CAD Downtime Log — migration 0003
-- lookups: single table backing every dropdown in the app.
-- units: apparatus/unit roster. Unit ids are text on purpose (e.g. "360A").

create table public.lookups (
  id uuid primary key default gen_random_uuid(),
  category text not null,
  value text not null,
  sort_order integer not null default 0,
  active boolean not null default true,
  constraint lookups_category_check check (category in (
    'call_source', 'activity_type', 'agency', 'priority', 'jurisdiction',
    'call_type', 'disposition', 'unit_disposition'
  )),
  constraint lookups_category_value_unique unique (category, value)
);

comment on table public.lookups is
  'Dropdown option lists. Never hard-delete a value — deactivate it instead, or historical records break.';

create index lookups_category_active_idx on public.lookups (category, active, sort_order);

create table public.units (
  id text primary key,
  agency text not null,
  unit_type text,
  sort_order integer not null default 0,
  active boolean not null default true,
  constraint units_agency_check check (agency in ('PD', 'Fire', 'EMS'))
);

comment on table public.units is
  'Unit/apparatus roster. id is the unit designator as text, e.g. 360, 360A, Engine 1.';

create index units_agency_active_idx on public.units (agency, active, sort_order);
