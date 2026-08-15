-- CAD Downtime Log — migration 0010
-- Row level security. No table is readable by anon. Enable + policy every table.

alter table public.profiles enable row level security;
alter table public.outages enable row level security;
alter table public.calls enable row level security;
alter table public.unit_assignments enable row level security;
alter table public.lookups enable row level security;
alter table public.units enable row level security;
alter table public.audit_log enable row level security;
alter table public.call_number_counters enable row level security;

-- profiles: a user reads/updates their own row; admins read/update all.
create policy profiles_select_self_or_admin on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.current_role() = 'admin');

create policy profiles_update_self_or_admin on public.profiles
  for update to authenticated
  using (id = auth.uid() or public.current_role() = 'admin')
  with check (id = auth.uid() or public.current_role() = 'admin');

-- outages: any authenticated non-readonly, active user reads all;
-- supervisor and admin insert and update.
create policy outages_select on public.outages
  for select to authenticated
  using (public.current_user_active() and public.current_role() in ('dispatcher', 'supervisor', 'admin'));

create policy outages_insert on public.outages
  for insert to authenticated
  with check (public.current_user_active() and public.current_role() in ('supervisor', 'admin'));

create policy outages_update on public.outages
  for update to authenticated
  using (public.current_user_active() and public.current_role() in ('supervisor', 'admin'))
  with check (public.current_user_active() and public.current_role() in ('supervisor', 'admin'));

-- calls: any authenticated non-readonly, active user reads all;
-- dispatcher and above insert; update allowed while not voided and the
-- parent outage is not closed. No delete policy at all.
create policy calls_select on public.calls
  for select to authenticated
  using (public.current_user_active() and public.current_role() in ('dispatcher', 'supervisor', 'admin'));

create policy calls_insert on public.calls
  for insert to authenticated
  with check (
    public.current_user_active()
    and public.current_role() in ('dispatcher', 'supervisor', 'admin')
    and exists (select 1 from public.outages o where o.id = outage_id and o.status <> 'closed')
  );

create policy calls_update on public.calls
  for update to authenticated
  using (
    public.current_user_active()
    and public.current_role() in ('dispatcher', 'supervisor', 'admin')
    and status <> 'voided'
    and exists (select 1 from public.outages o where o.id = outage_id and o.status <> 'closed')
  )
  with check (
    public.current_user_active()
    and public.current_role() in ('dispatcher', 'supervisor', 'admin')
  );

-- unit_assignments: gated on the parent call.
create policy unit_assignments_select on public.unit_assignments
  for select to authenticated
  using (public.current_user_active() and public.current_role() in ('dispatcher', 'supervisor', 'admin'));

create policy unit_assignments_insert on public.unit_assignments
  for insert to authenticated
  with check (
    public.current_user_active()
    and public.current_role() in ('dispatcher', 'supervisor', 'admin')
    and exists (
      select 1 from public.calls c join public.outages o on o.id = c.outage_id
      where c.id = call_id and c.status <> 'voided' and o.status <> 'closed'
    )
  );

create policy unit_assignments_update on public.unit_assignments
  for update to authenticated
  using (
    public.current_user_active()
    and public.current_role() in ('dispatcher', 'supervisor', 'admin')
    and exists (
      select 1 from public.calls c join public.outages o on o.id = c.outage_id
      where c.id = call_id and c.status <> 'voided' and o.status <> 'closed'
    )
  )
  with check (
    public.current_user_active()
    and public.current_role() in ('dispatcher', 'supervisor', 'admin')
  );

-- lookups, units: read for all authenticated; write for admin.
create policy lookups_select on public.lookups
  for select to authenticated
  using (true);

create policy lookups_write on public.lookups
  for all to authenticated
  using (public.current_user_active() and public.current_role() = 'admin')
  with check (public.current_user_active() and public.current_role() = 'admin');

create policy units_select on public.units
  for select to authenticated
  using (true);

create policy units_write on public.units
  for all to authenticated
  using (public.current_user_active() and public.current_role() = 'admin')
  with check (public.current_user_active() and public.current_role() = 'admin');

-- audit_log: read for supervisor and admin. No insert/update/delete policy
-- for any role — the trigger writes it as security definer / table owner.
create policy audit_log_select on public.audit_log
  for select to authenticated
  using (public.current_user_active() and public.current_role() in ('supervisor', 'admin'));

-- call_number_counters: no client access at all, only next_call_number()
-- (security definer) touches this table.
