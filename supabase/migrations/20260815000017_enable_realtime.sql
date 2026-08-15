-- CAD Downtime Log — migration 0017
-- Enable Realtime replication on the tables the board subscribes to (§7.2).
-- Without this, postgres_changes never fires and the UI never reflects a
-- write that already succeeded — writes were working, nothing told the
-- browser to re-render.

alter publication supabase_realtime add table public.calls;
alter publication supabase_realtime add table public.unit_assignments;
alter publication supabase_realtime add table public.outages;
