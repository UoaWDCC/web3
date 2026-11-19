-- Luma registration link shown as the Register button on the public event
-- page. Nullable: events without a link show "Registration opens soon".
alter table public.events
  add column if not exists registration_url text;
