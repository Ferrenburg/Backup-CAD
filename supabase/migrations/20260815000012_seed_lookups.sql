-- CAD Downtime Log — migration 0012
-- Seed lookup lists, verbatim from the agency's current lists (§10).

insert into public.lookups (category, value, sort_order) values
  ('call_source', '911', 1),
  ('call_source', 'Admin Line', 2),
  ('call_source', 'Radio', 3),
  ('call_source', 'Walk-In', 4),
  ('call_source', 'Officer Initiated', 5),
  ('call_source', 'Alarm Company', 6),
  ('call_source', 'Text-to-911', 7),
  ('call_source', 'Transfer from Polk Co', 8),
  ('call_source', 'Other Agency', 9),
  ('call_source', 'Other', 10),

  ('activity_type', 'Call for Service', 1),
  ('activity_type', 'Self-Initiated', 2),
  ('activity_type', 'Location / Premise Check', 3),
  ('activity_type', 'Administrative', 4),
  ('activity_type', 'Mutual Aid Given', 5),
  ('activity_type', 'Mutual Aid Received', 6),
  ('activity_type', 'Test / Training', 7),

  ('agency', 'ACTT PD', 1),
  ('agency', 'ACTT Fire', 2),
  ('agency', 'Allegiance EMS', 3),
  ('agency', 'PD + Fire', 4),
  ('agency', 'PD + EMS', 5),
  ('agency', 'Fire + EMS', 6),
  ('agency', 'All Units', 7),
  ('agency', 'Mutual Aid', 8),
  ('agency', 'Other', 9),

  ('priority', 'P1 - Life Threat', 1),
  ('priority', 'P2 - Urgent', 2),
  ('priority', 'P3 - Routine', 3),
  ('priority', 'P4 - Non-Emergency', 4),
  ('priority', 'P5 - Administrative', 5),

  ('jurisdiction', 'ACTT Reservation', 1),
  ('jurisdiction', 'Polk County', 2),
  ('jurisdiction', 'Tyler County', 3),
  ('jurisdiction', 'Mutual Aid Out', 4),
  ('jurisdiction', 'Unknown', 5),

  ('call_type', 'Alarm - Burglar', 1),
  ('call_type', 'Alarm - Fire', 2),
  ('call_type', 'Alarm - Medical', 3),
  ('call_type', 'Animal Call', 4),
  ('call_type', 'Assault', 5),
  ('call_type', 'Assist Other Agency', 6),
  ('call_type', 'Burglary', 7),
  ('call_type', 'Citizen Contact', 8),
  ('call_type', 'Civil Matter', 9),
  ('call_type', 'Criminal Mischief', 10),
  ('call_type', 'Disturbance', 11),
  ('call_type', 'Domestic Disturbance', 12),
  ('call_type', 'Fire - Brush/Grass', 13),
  ('call_type', 'Fire - Structure', 14),
  ('call_type', 'Fire - Vehicle', 15),
  ('call_type', 'Fire - Other', 16),
  ('call_type', 'Hazmat / Spill', 17),
  ('call_type', 'Location Check', 18),
  ('call_type', 'Medical Emergency', 19),
  ('call_type', 'Mental Health Call', 20),
  ('call_type', 'Missing Person', 21),
  ('call_type', 'MVA - Injury', 22),
  ('call_type', 'MVA - No Injury', 23),
  ('call_type', 'Public Assist', 24),
  ('call_type', 'Reckless Driver', 25),
  ('call_type', 'Suspicious Person/Vehicle', 26),
  ('call_type', 'Theft', 27),
  ('call_type', 'Traffic Stop', 28),
  ('call_type', 'Trespassing', 29),
  ('call_type', 'Utility / Infrastructure', 30),
  ('call_type', 'Warrant Service', 31),
  ('call_type', 'Weather / Severe', 32),
  ('call_type', 'Welfare Check', 33),
  ('call_type', 'Other', 34),

  ('disposition', 'Report Taken', 1),
  ('disposition', 'Arrest Made', 2),
  ('disposition', 'Citation Issued', 3),
  ('disposition', 'Warning Issued', 4),
  ('disposition', 'Unfounded', 5),
  ('disposition', 'Gone on Arrival', 6),
  ('disposition', 'Unable to Locate', 7),
  ('disposition', 'Referred to Other Agency', 8),
  ('disposition', 'Transported', 9),
  ('disposition', 'Refusal / Signed Release', 10),
  ('disposition', 'Handled by Officer', 11),
  ('disposition', 'Cancelled En Route', 12),
  ('disposition', 'False Alarm', 13),
  ('disposition', 'Assist Rendered', 14),
  ('disposition', 'Pending / Open', 15),
  ('disposition', 'Location Secure', 16),

  ('unit_disposition', 'Cleared - Available', 1),
  ('unit_disposition', 'Cleared - Report Pending', 2),
  ('unit_disposition', 'Out of Service', 3),
  ('unit_disposition', 'Transported to Facility', 4),
  ('unit_disposition', 'Cancelled', 5),
  ('unit_disposition', 'Staged', 6),
  ('unit_disposition', 'Still On Scene', 7);

-- units (§10). PD patrol 360-390, PD patrol 24-39, Fire apparatus.
insert into public.units (id, agency, unit_type, sort_order)
select n::text, 'PD', 'Patrol', 100 + (n - 360)
from generate_series(360, 390) as n;

insert into public.units (id, agency, unit_type, sort_order)
select n::text, 'PD', 'Patrol', 200 + (n - 24)
from generate_series(24, 39) as n;

insert into public.units (id, agency, unit_type, sort_order) values
  ('Engine 1', 'Fire', 'Engine', 300),
  ('Brush 1', 'Fire', 'Brush', 301),
  ('Rescue 1', 'Fire', 'Rescue', 302),
  ('Tanker 1', 'Fire', 'Tanker', 303),
  ('Engine 2 (Snowman)', 'Fire', 'Engine', 304),
  ('Brush 2', 'Fire', 'Brush', 305),
  ('Rescue 2', 'Fire', 'Rescue', 306),
  ('Tanker 2', 'Fire', 'Tanker', 307);
