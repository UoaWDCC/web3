-- Adds the fields the public events page needs but the table never stored.
--
-- `location` renders next to the map pin on the event card and detail view.
-- `capacity` feeds the "Full" chip once registrations exist; null means uncapped.
--
-- Both are nullable so existing rows stay valid. Run in the Supabase SQL editor.

alter table public.events
  add column if not exists location text,
  add column if not exists capacity integer;
