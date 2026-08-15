-- CAD Downtime Log — migration 0008
-- audit_log: append-only. Written only by trigger, security definer.

create table public.audit_log (
  id bigserial primary key,
  table_name text not null,
  record_id uuid not null,
  action text not null,
  actor_id uuid,
  actor_name text,
  changed_at timestamptz not null default now(),
  before jsonb,
  after jsonb,
  changed_fields text[],
  constraint audit_log_action_check check (action in ('INSERT', 'UPDATE', 'VOID'))
);

comment on table public.audit_log is
  'Append-only audit trail. Written only by the audit_row_change() trigger function (security definer). No application role has INSERT, UPDATE, or DELETE privileges on this table.';

create index audit_log_table_record_idx on public.audit_log (table_name, record_id, changed_at desc);

-- Generic audit trigger. Detects a VOID transition on tables that carry a
-- boolean `voided` column (currently only calls); everything else is
-- INSERT/UPDATE. Runs as security definer / table owner so it can write to
-- audit_log even though no role holds direct INSERT privilege there.
create or replace function public.audit_row_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_action text;
  v_record_id uuid;
  v_actor_name text;
  v_changed_fields text[];
  v_before jsonb;
  v_after jsonb;
begin
  if tg_op = 'INSERT' then
    v_action := 'INSERT';
    v_record_id := new.id;
    v_before := null;
    v_after := to_jsonb(new);
    v_changed_fields := null;
  elsif tg_op = 'UPDATE' then
    v_before := to_jsonb(old);
    v_after := to_jsonb(new);
    v_record_id := new.id;

    select array_agg(n.key order by n.key)
      into v_changed_fields
    from jsonb_each(v_after) n
    join jsonb_each(v_before) o using (key)
    where n.value is distinct from o.value;

    if (v_after ? 'voided') and (v_before ->> 'voided') = 'false' and (v_after ->> 'voided') = 'true' then
      v_action := 'VOID';
    else
      v_action := 'UPDATE';
    end if;
  else
    return coalesce(new, old);
  end if;

  select p.full_name into v_actor_name from public.profiles p where p.id = auth.uid();

  insert into public.audit_log (table_name, record_id, action, actor_id, actor_name, before, after, changed_fields)
  values (tg_table_name, v_record_id, v_action, auth.uid(), v_actor_name, v_before, v_after, v_changed_fields);

  return new;
end;
$$;

create trigger outages_audit
  after insert or update on public.outages
  for each row execute function public.audit_row_change();

create trigger calls_audit
  after insert or update on public.calls
  for each row execute function public.audit_row_change();

create trigger unit_assignments_audit
  after insert or update on public.unit_assignments
  for each row execute function public.audit_row_change();

create trigger profiles_audit
  after insert or update on public.profiles
  for each row execute function public.audit_row_change();
