create table if not exists public.profile_qr_credentials (
  registration_id bigint primary key
    references public.registrations(id) on delete cascade,
  qr_secret text not null unique
    check (qr_secret ~ '^[A-Za-z0-9_-]{43}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profile_qr_credentials is
  'Server-only check-in credentials, kept independently of public profile visibility.';

alter table public.profile_qr_credentials enable row level security;

revoke all on table public.profile_qr_credentials
  from public, anon, authenticated;

grant select, insert, update, delete on table public.profile_qr_credentials
  to service_role;

-- Preserve credentials that were issued before they were moved off the
-- public_profiles row. Dynamic SQL keeps this migration safe in environments
-- where the legacy qr_secret column was never created.
do $migration$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'public_profiles'
      and column_name = 'qr_secret'
  ) then
    execute $sql$
      insert into public.profile_qr_credentials (registration_id, qr_secret)
      select registration_id, qr_secret
      from public.public_profiles
      where qr_secret is not null
      on conflict do nothing
    $sql$;

    execute 'alter table public.public_profiles drop column qr_secret';
  end if;
end;
$migration$;
