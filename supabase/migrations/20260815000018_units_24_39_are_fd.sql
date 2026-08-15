-- CAD Downtime Log — migration 0018
-- Correction to seed data: units 24-39 are Fire Department, not PD, per
-- the agency (not the original spec's §10 listing).

alter table public.units drop constraint units_agency_check;
alter table public.units add constraint units_agency_check check (agency in ('PD', 'FD', 'Fire', 'EMS'));

update public.units
set agency = 'FD'
where id in ('24','25','26','27','28','29','30','31','32','33','34','35','36','37','38','39');
