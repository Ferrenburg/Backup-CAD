-- CAD Downtime Log — migration 0015
-- Performance advisor cleanup: avoid per-row re-evaluation of auth.uid() in
-- RLS policies, split "for all" write policies so they don't duplicate the
-- dedicated SELECT policy, and cover foreign keys with indexes.

drop policy profiles_select_self_or_admin on public.profiles;
create policy profiles_select_self_or_admin on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or public.current_role() = 'admin');

drop policy profiles_update_self_or_admin on public.profiles;
create policy profiles_update_self_or_admin on public.profiles
  for update to authenticated
  using (id = (select auth.uid()) or public.current_role() = 'admin')
  with check (id = (select auth.uid()) or public.current_role() = 'admin');

drop policy lookups_write on public.lookups;
create policy lookups_insert on public.lookups
  for insert to authenticated
  with check (public.current_user_active() and public.current_role() = 'admin');
create policy lookups_update on public.lookups
  for update to authenticated
  using (public.current_user_active() and public.current_role() = 'admin')
  with check (public.current_user_active() and public.current_role() = 'admin');

drop policy units_write on public.units;
create policy units_insert on public.units
  for insert to authenticated
  with check (public.current_user_active() and public.current_role() = 'admin');
create policy units_update on public.units
  for update to authenticated
  using (public.current_user_active() and public.current_role() = 'admin')
  with check (public.current_user_active() and public.current_role() = 'admin');

create index calls_back_entered_by_idx on public.calls (back_entered_by);
create index calls_call_taker_id_idx on public.calls (call_taker_id);
create index calls_created_by_idx on public.calls (created_by);
create index calls_dispatcher_id_idx on public.calls (dispatcher_id);
create index calls_verified_by_idx on public.calls (verified_by);
create index calls_voided_by_idx on public.calls (voided_by);
create index outages_opened_by_idx on public.outages (opened_by);
