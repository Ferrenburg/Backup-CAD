-- CAD Downtime Log — migration 0005
-- Sequential call number issuance, safe under concurrency.

create table public.call_number_counters (
  year integer primary key,
  last_number integer not null default 0
);

comment on table public.call_number_counters is
  'Internal counter backing next_call_number(). Not exposed to the UI directly.';

create or replace function public.next_call_number(p_year integer)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  n integer;
begin
  insert into call_number_counters (year, last_number)
  values (p_year, 1)
  on conflict (year) do update
    set last_number = call_number_counters.last_number + 1
  returning last_number into n;
  return 'DT-' || p_year::text || '-' || lpad(n::text, 4, '0');
end;
$$;

comment on function public.next_call_number(integer) is
  'Issues the next sequential call number for the given year. The INSERT ... ON CONFLICT DO UPDATE ... RETURNING takes a row lock, making concurrent issuance safe. Numbers are never reused, including for voided calls.';
